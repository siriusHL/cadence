import { EmptyState } from '@/components/EmptyState';

// Stub. Real preferences (refresh frequency, number locale, notification
// channels, etc.) land here as features ask for them. For now most
// settings are personal-account fields living under /app/profile.
export default function SettingsPage() {
  return (
    <EmptyState
      icon="⚙"
      title="Settings"
      body="Personal details (display name, base currency, tax residence) live under Profile. Notification, refresh, and locale preferences will land here as the app grows."
      ctaLabel="Open Profile"
      ctaHref="/app/profile"
    />
  );
}
