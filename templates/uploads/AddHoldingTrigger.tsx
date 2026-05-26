import { getSupabaseServer } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/ProfileForm';
import { COUNTRY_NAMES } from '@/lib/tax';

export default async function ProfilePage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, base_currency, tax_country')
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

  return (
    <div className="cdn-pro" style={{ maxWidth: 720, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Profile</h1>
          <div className="sub">
            Display name, base currency, and tax residence drive how Cadence formats numbers
            and computes your dividend tax.
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
    </div>
  );
}
