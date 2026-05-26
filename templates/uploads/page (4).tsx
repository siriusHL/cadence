import { TopProgressBar } from '@/components/TopProgressBar';

/**
 * Shown by the App Router whenever an /app/<screen> route is transitioning.
 * The persistent nav (from /app/layout.tsx) stays put; we render only a thin
 * progress bar pinned to the top of the viewport — no skeleton, no layout
 * shift. The current page content visually persists at slightly reduced
 * opacity (the parent screen's React tree is suspended), and the new content
 * fades in once ready.
 */
export default function AppLoading() {
  return <TopProgressBar />;
}
