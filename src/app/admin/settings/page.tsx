import { supabaseAdmin } from '@/lib/supabase/admin';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';
import { normalizeTheme } from '@/lib/announcementThemes';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const { data } = await supabaseAdmin()
    .from('site_settings')
    .select('maintenance_mode, announcement, announcement_active, announcement_theme, updated_at, updated_by')
    .eq('id', 1)
    .maybeSingle();

  const updated = data?.updated_at
    ? `Last updated ${new Date(data.updated_at).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}` +
      (data.updated_by ? ` by ${data.updated_by}` : '')
    : 'Not yet configured';

  return (
    <>
      <h1 className="adm-h1">Site settings</h1>
      <p className="adm-sub">{updated}</p>

      <div className="adm-card">
        <h2>Maintenance &amp; announcements</h2>
        <SiteSettingsForm
          initial={{
            maintenance_mode: data?.maintenance_mode ?? false,
            announcement: data?.announcement ?? null,
            announcement_active: data?.announcement_active ?? false,
            announcement_theme: normalizeTheme(data?.announcement_theme),
          }}
        />
      </div>
    </>
  );
}
