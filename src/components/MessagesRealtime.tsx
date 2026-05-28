'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useToast } from './DialogProvider';
import { MESSAGES_CHANGED_EVENT } from './useUnreadMessages';

/**
 * Mounted once in the app shell. Opens a single Supabase Realtime subscription
 * to inserts on `messages` and reacts the instant support replies:
 *   - fires MESSAGES_CHANGED_EVENT so every unread badge re-fetches, and
 *   - shows a toast (unless the user is already reading that thread).
 *
 * RLS scopes the stream to the user's own threads (see 0013 migration), so no
 * client-side ownership check is needed; we only narrow to support-authored
 * rows server-side via the channel filter.
 */
export function MessagesRealtime() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  // Keep the latest path in a ref so the stable subscription effect can read it
  // without re-subscribing on every navigation.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const supabase = supabaseBrowser();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;

    function handleInsert(payload: { new: { thread_id?: string } }) {
      const threadId = payload.new.thread_id;
      window.dispatchEvent(new CustomEvent(MESSAGES_CHANGED_EVENT));
      // Re-render the current route so an open thread / the inbox list shows
      // the new message live (server components re-run; cheap).
      router.refresh();
      // Don't toast if they're already looking at this exact thread.
      if (threadId && pathRef.current === `/app/messages/${threadId}`) return;
      toast('New reply from support');
    }

    (async () => {
      // RLS-filtered postgres_changes only deliver rows the user can SELECT, so
      // the websocket must carry the user's JWT. Set it explicitly before
      // subscribing to avoid a race where the channel joins as anon and the
      // server silently filters everything out.
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (disposed) return;

      channel = supabase
        .channel('support-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: 'sender=eq.support' },
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
