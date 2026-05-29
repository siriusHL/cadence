import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { UpgradeContent } from './UpgradeContent';

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

  return <UpgradeContent />;
}
