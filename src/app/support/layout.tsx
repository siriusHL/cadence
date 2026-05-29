import Link from 'next/link';
import { requireSupportPage } from '@/lib/roles';
import { DialogProvider } from '@/components/DialogProvider';
import { SupportMessagesRealtime } from '@/components/SupportMessagesRealtime';
import { SupportUserMenu } from '@/components/SupportUserMenu';

// Standalone staff area — deliberately outside the customer /app shell (no tier
// tabs, portfolio switcher, etc). The layout gate redirects anyone whose
// profile role isn't 'support'/'admin', so every page below sits behind it.
export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSupportPage();
  const initials = (user.email ?? '??').slice(0, 2).toUpperCase();

  return (
    <DialogProvider>
      <SupportMessagesRealtime />
      <div className="cdn-free flex flex-col min-h-screen">
        <div className="fnav">
          <Link href="/support/messages" className="brand">
            <span className="dot" /> Cadence Support
          </Link>
          <div className="right">
            <SupportUserMenu email={user.email ?? ''} initials={initials} />
          </div>
        </div>
        <div className="scroll">{children}</div>
      </div>
    </DialogProvider>
  );
}
