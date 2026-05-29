import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const { data } = await supabaseAdmin()
    .from('site_settings')
    .select('announcement, announcement_active')
    .eq('id', 1)
    .maybeSingle();

  const message = data?.announcement_active && data.announcement
    ? data.announcement
    : "We're performing scheduled maintenance and will be back shortly. Thanks for your patience.";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-accent-soft" style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 24 }} />
      <h1 className="text-2xl font-semibold mb-3">We&rsquo;ll be right back</h1>
      <p className="text-ink-soft max-w-md">{message}</p>
    </main>
  );
}
