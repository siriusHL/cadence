import { getSupabaseServer } from '@/lib/supabase/server';
import { can, canAccessScreen, type Tier, type Screen } from '@/lib/tiers';
import { SettingsForm } from '@/components/SettingsForm';
import { GoogleCalendarConnect } from '@/components/GoogleCalendarConnect';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { AccountMobile } from '@/components/mobile/AccountMobile';

interface ScreenOption { value: Screen; label: string; }

const ALL_SCREENS: ScreenOption[] = [
  { value: 'home',            label: 'Home' },
  { value: 'next',            label: 'Coming up' },
  { value: 'stocks',          label: 'Your stocks' },
  { value: 'year',            label: 'Your year' },
  { value: 'dashboard',       label: 'Dashboard' },
  { value: 'holdings',        label: 'Holdings' },
  { value: 'dividends',       label: 'Dividends' },
  { value: 'performance',     label: 'Performance' },
  { value: 'diversification', label: 'Diversification' },
  { value: 'tax',             label: 'Tax' },
  { value: 'alerts',          label: 'Alerts' },
];

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase.from('subscriptions').select('tier').eq('user_id', user!.id).maybeSingle(),
    supabase.from('profiles').select('contrast, bg_tone, default_screen, income_target').eq('id', user!.id).maybeSingle(),
  ]);

  const tier = (sub?.tier ?? 'free') as Tier;
  const screenOptions = ALL_SCREENS.filter((s) => canAccessScreen(tier, s.value));

  const activePortfolio = await getActivePortfolio(supabase, user!.id);
  const portfolioName = activePortfolio?.name ?? 'Main portfolio';
  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  const showGcal = can(tier, 'googleCalendarSync');

  const formContent = (
    <>
      <SettingsForm
        initial={{
          contrast: (profile?.contrast as 'soft' | 'standard' | 'sharp' | undefined) ?? 'standard',
          bgTone:   (profile?.bg_tone  as 'cream' | 'neutral' | 'cool' | undefined) ?? 'cream',
          defaultScreen: (profile?.default_screen as Screen | null | undefined) ?? null,
          incomeTarget:  Number(profile?.income_target ?? 30000),
        }}
        screenOptions={screenOptions}
      />
      {showGcal ? <GoogleCalendarConnect /> : null}
    </>
  );

  return (
    <>
      <div className="cdn-mobile-only">
        <AccountMobile
          title="Settings"
          sub="Personal preferences for how Cadence looks and behaves on this account."
          portfolioName={portfolioName}
          avatarInitials={avatarInitials}
        >
          {formContent}
        </AccountMobile>
      </div>
      <div className="cdn-desktop-only">
    <div className="cdn-pro" style={{ maxWidth: 720, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Settings</h1>
          <div className="sub">
            Personal preferences for how Cadence looks and behaves on this account.
            Profile details (display name, currency, tax residence) live under Profile.
          </div>
        </div>
      </div>
      {formContent}
    </div>
      </div>
    </>
  );
}
