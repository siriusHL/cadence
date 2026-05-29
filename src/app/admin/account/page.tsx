import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { AccountSecurityForm } from '@/components/AccountSecurityForm';

export const dynamic = 'force-dynamic';

// Admin account & security — kept under the admin shell so the avatar menu
// never links admins out to the customer /app area.
export default async function AdminAccountPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdminEmail(user.email)) redirect('/app');

  return (
    <>
      <h1 className="adm-h1">Account &amp; security</h1>
      <p className="adm-sub">Update the password you sign in with.</p>

      <div className="adm-card">
        <AccountSecurityForm currentEmail={user.email ?? ''} passwordOnly />
      </div>
    </>
  );
}
