import { getSupabaseServer } from '@/lib/supabase/server';
import { canAccessScreen, type Tier, type Screen } from '@/lib/tiers';
import { SettingsForm } from '@/components/SettingsForm';

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
    supabase.from('profiles').select('contrast, bg_tone, default_screen, income_target, accountant_email').eq('id', user!.id).maybeSingle(),
  ]);

  const tier = (sub?.tier ?? 'free') as Tier;
  const screenOptions = ALL_SCREENS.filter((s) => canAccessScreen(tier, s.value));

  return (
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

      <SettingsForm
        initial={{
          contrast: (profile?.contrast as 'soft' | 'standard' | 'sharp' | undefined) ?? 'standard',
          bgTone:   (profile?.bg_tone  as 'cream' | 'neutral' | 'cool' | undefined) ?? 'cream',
          defaultScreen: (profile?.default_screen as Screen | null | undefined) ?? null,
          incomeTarget:  Number(profile?.income_target ?? 30000),
          accountantEmail: profile?.accountant_email ?? '',
        }}
        screenOptions={screenOptions}
      />
    </div>
  );
}
