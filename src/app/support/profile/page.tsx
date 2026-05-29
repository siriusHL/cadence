import { requireSupportPage } from '@/lib/roles';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/ProfileForm';

export const dynamic = 'force-dynamic';

// Staff profile — lives under the support shell so staff never bounce into the
// customer /app area. ProfileForm with isStaff hides all investor-only fields
// (KYC, address, base currency, tax residence); only name/display name/phone show.
export default async function SupportProfilePage() {
  const user = await requireSupportPage();
  const supabase = await getSupabaseServer();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, base_currency, tax_country, first_name, last_name, birth_date, phone, sex, address_line1, address_line2, address_city, address_postal_code, address_country')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="cdn-pro" style={{ maxWidth: 720, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Profile</h1>
          <div className="sub">Your account details for the Cadence team.</div>
        </div>
        <div className="right-meta">
          <span className="live">{user.email}</span>
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Personal details</div>
        </div>
        <ProfileForm
          initial={{
            displayName:       profile?.display_name ?? '',
            baseCurrency:      profile?.base_currency ?? 'EUR',
            taxCountry:        profile?.tax_country ?? '',
            firstName:         profile?.first_name ?? '',
            lastName:          profile?.last_name ?? '',
            birthDate:         profile?.birth_date ?? '',
            phone:             profile?.phone ?? '',
            sex:               profile?.sex ?? '',
            addressLine1:      profile?.address_line1 ?? '',
            addressLine2:      profile?.address_line2 ?? '',
            addressCity:       profile?.address_city ?? '',
            addressPostalCode: profile?.address_postal_code ?? '',
            addressCountry:    profile?.address_country ?? '',
          }}
          taxResidences={[]}
          countries={[]}
          isStaff
        />
      </div>
    </div>
  );
}
