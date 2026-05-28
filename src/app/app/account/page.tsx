import { getSupabaseServer } from '@/lib/supabase/server';
import { AccountSecurityForm } from '@/components/AccountSecurityForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="cdn-pro" style={{ maxWidth: 720, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Account &amp; security</h1>
          <div className="sub">
            Manage the email and password you sign in with, or permanently delete
            your account and all associated data.
          </div>
        </div>
      </div>

      <AccountSecurityForm currentEmail={user!.email ?? ''} />
    </div>
  );
}
