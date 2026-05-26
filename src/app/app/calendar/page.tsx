import { redirect } from 'next/navigation';

// Calendar was merged into the Dividends page. Old bookmarks land on the
// Year view tab, which is the closest analogue to the previous heatmap.
export default function CalendarRedirect() {
  redirect('/app/dividends?tab=year');
}
