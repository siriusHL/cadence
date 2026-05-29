'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useToast } from './DialogProvider';

/**
 * Mounted once in the staff support shell. Subscribes to inserts on `messages`
 * filtered to customer-authored rows and reacts live: re-renders the route so
 * the list/thread updates, and toasts unless the agent is already reading that
 * thread.
 *
 * Delivery is RLS-scoped: the messages_support_select policy (migration 0014)
 * lets a support subscriber SELECT every message, so postgres_changes streams
 * them all — no server broadcast needed. The websocket must carry the staff
 * user's JWT for the policy to evaluate, so we set it before subscribing.
 */
export function SupportMessagesRealtime() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;

    function handleInsert(payload: { new: { thread_id?: string } }) {
      const threadId = payload.new.thread_id;
      router.refresh();
      if (threadId && pathRef.current === `/support/messages/${threadId}`) return;
      toast('New customer message');
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (disposed) return;

      channel = supabase
        .channel('support-board-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: 'sender=eq.user' },
          handleInsert,
        )
        .subscribe();
    })();

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [toast, router]);

  return null;
}
