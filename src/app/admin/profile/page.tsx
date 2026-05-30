import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { ProfileForm } from '@/components/ProfileForm';

export const dynamic = 'force-dynamic';

// Admin profile — lives under the admin shell so admins never bounce into the
// customer /app area. ProfileForm with isStaff hides investor-only fields
// (KYC, address, base currency, tax residence); only name/display name/phone show.
export default async function AdminProfilePage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdminEmail(user.email)) redirect('/app');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, base_currency, tax_country, first_name, last_name, birth_date, phone, sex, address_line1, address_line2, address_city, address_postal_code, address_country')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <>
      <h1 className="adm-h1">Profile</h1>
      <p className="adm-sub">{user.email}</p>

      <div className="adm-card">
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
    </>
  );
}
