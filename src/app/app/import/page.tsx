import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { can, type Tier } from '@/lib/tiers';
import { CsvImportClient } from '@/components/CsvImportClient';

export const dynamic = 'force-dynamic';

export default async function ImportScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user!.id)
    .maybeSingle();
  const tier = (sub?.tier ?? 'free') as Tier;
  if (!can(tier, 'csvImport')) redirect('/upgrade');

  return (
    <div className="cdn-pro" style={{ maxWidth: 1080, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account · CSV import</div>
          <h1>Bring your portfolio in</h1>
          <div className="sub">
            Export a transactions CSV from your broker and drop it below. Cadence parses it,
            shows every row before anything is saved, then writes only the trades you keep
            into your active portfolio.
          </div>
        </div>
        <div className="right-meta">
          <span className="live">DEGIRO · Interactive Brokers · Trade Republic</span>
          <span>Duplicates skipped automatically</span>
        </div>
      </div>

      <CsvImportClient />
    </div>
  );
}
