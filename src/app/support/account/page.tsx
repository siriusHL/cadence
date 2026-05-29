import { requireSupportPage } from '@/lib/roles';
import { AccountSecurityForm } from '@/components/AccountSecurityForm';

export const dynamic = 'force-dynamic';

// Staff account & security — kept under the support shell so the avatar menu
// never links staff out to the customer /app area.
export default async function SupportAccountPage() {
  const user = await requireSupportPage();

  return (
    <div className="cdn-pro" style={{ maxWidth: 720, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Account &amp; security</h1>
          <div className="sub">
            Update the password you sign in with.
          </div>
        </div>
      </div>

      <AccountSecurityForm currentEmail={user.email ?? ''} passwordOnly />
    </div>
  );
}
