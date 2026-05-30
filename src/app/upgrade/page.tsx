import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { UpgradeContent, type CurrentTier } from './UpgradeContent';

export const dynamic = 'force-dynamic';

// Server-side auth guard — defense in depth on top of the proxy. The upgrade
// flow is for signed-in users (checkout needs an account), so an unauthenticated
// hit must never render the pricing/checkout UI even if middleware is bypassed.
export default async function UpgradePage(
  { searchParams }: { searchParams: Promise<{ from?: string }> },
) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { from } = await searchParams;
    const next = from ? `/upgrade?from=${encodeURIComponent(from)}` : '/upgrade';
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Elite is the top tier — there's nothing to upgrade to, and starting a
  // checkout would risk a redundant subscription. Send them back to the app
  // (plan changes/cancellation happen via the billing portal). Free + premium
  // both have a higher tier to buy, so they see the page.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .single();
  if (sub?.tier === 'elite') redirect('/app');

  return <UpgradeContent currentTier={(sub?.tier ?? 'free') as CurrentTier} />;
}
