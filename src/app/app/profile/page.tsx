import { getSupabaseServer } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/ProfileForm';
import { NotificationsForm } from '@/components/NotificationsForm';
import { SecurityForm } from '@/components/SecurityForm';
import { AccountDangerZone } from '@/components/AccountDangerZone';
import { COUNTRY_NAMES } from '@/lib/tax';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { AccountMobile } from '@/components/mobile/AccountMobile';

export default async function ProfilePage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, base_currency, tax_country, notify_dividend_events, notify_concentration, notify_tax_opportunities, notify_drawdown, notify_email_frequency')
    .eq('id', user!.id)
    .maybeSingle();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', user!.id)
    .maybeSingle();

  // Residences the Tax screen has tax models for — show these first.
  const taxResidenceCodes = ['IE', 'NL', 'DE', 'FR', 'ES', 'IT', 'GB', 'BE', 'PT', 'AT'];
  const taxResidences = taxResidenceCodes.map((code) => ({
    code,
    name: COUNTRY_NAMES[code] ?? code,
  }));

  const activePortfolio = await getActivePortfolio(supabase, user!.id);
  const portfolioName = activePortfolio?.name ?? 'Main portfolio';
  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  // `new_email` is populated by supabase.auth while a change-email
  // confirmation is outstanding — null at all other times.
  const pendingEmail = (user as { new_email?: string | null } | null)?.new_email ?? null;

  const sections = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Personal details</div>
        </div>
        <ProfileForm
          initial={{
            displayName:  profile?.display_name ?? '',
            baseCurrency: profile?.base_currency ?? 'EUR',
            taxCountry:   profile?.tax_country ?? '',
          }}
          taxResidences={taxResidences}
        />
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Notifications</div>
        </div>
        <NotificationsForm
          initial={{
            dividend_events:   profile?.notify_dividend_events   ?? true,
            concentration:     profile?.notify_concentration     ?? true,
            tax_opportunities: profile?.notify_tax_opportunities ?? true,
            drawdown:          profile?.notify_drawdown          ?? true,
            email_frequency:   (profile?.notify_email_frequency as 'off' | 'daily' | 'weekly' | undefined) ?? 'off',
          }}
        />
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Security</div>
        </div>
        <SecurityForm
          currentEmail={user?.email ?? ''}
          pendingEmail={pendingEmail}
        />
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Account</div>
        </div>
        <AccountDangerZone />
      </div>
    </div>
  );

  return (
    <>
      <div className="cdn-mobile-only">
        <AccountMobile
          title="Profile"
          sub="Personal details, notifications, security, and account controls all live here."
          portfolioName={portfolioName}
          avatarInitials={avatarInitials}
        >
          {sections}
        </AccountMobile>
      </div>
      <div className="cdn-desktop-only">
        <div className="cdn-pro" style={{ maxWidth: 720, marginInline: 'auto' }}>
          <div className="pro-hero">
            <div>
              <div className="eyebrow">Account</div>
              <h1>Profile</h1>
              <div className="sub">
                Personal details, notification preferences, sign-in security, and
                data controls — all in one place.
              </div>
            </div>
            <div className="right-meta">
              <span className="live">{user!.email}</span>
              <span>
                {sub?.tier ? `${sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} plan` : 'Free plan'}
              </span>
              {sub?.current_period_end && (
                <span>
                  renews {new Date(sub.current_period_end).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          {sections}
        </div>
      </div>
    </>
  );
}
