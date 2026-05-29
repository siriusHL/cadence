import './admin.css';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { DialogProvider } from '@/components/DialogProvider';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminUserMenu } from '@/components/admin/AdminUserMenu';

// Defense in depth: the proxy already gates /admin, but re-check here so a
// direct hit (or a proxy misconfig) can never render admin data to a non-admin.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdminEmail(user.email)) redirect('/app');

  const initials = (user.email ?? '??').slice(0, 2).toUpperCase();

  return (
    <DialogProvider>
      <div className="adm-shell">
        <header className="adm-bar">
          <Link href="/admin" className="adm-brand">
            Cadence <span className="tag">ADMIN</span>
          </Link>
          <AdminNav />
          <div className="adm-spacer">
            <AdminUserMenu email={user.email ?? ''} initials={initials} />
          </div>
        </header>
        <main className="adm-main">{children}</main>
      </div>
    </DialogProvider>
  );
}
