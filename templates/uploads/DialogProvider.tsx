import { redirect } from 'next/navigation';

// Simulator was merged into the Dividends page as a tab. Old bookmarks
// land on the matching tab.
export default function SimulatorRedirect() {
  redirect('/app/dividends?tab=simulator');
}
