import { redirect } from 'next/navigation';

// Forecast was merged into the Dividends page.
export default function ForecastRedirect() {
  redirect('/app/dividends?tab=forecast');
}
