/**
 * Thin progress bar pinned to the top of the viewport.
 * Rendered by loading.tsx — visible only while a route is in transition.
 *
 * The animation never reaches 100% on its own (it eases toward 90%); React
 * unmounts the bar the moment the new route is ready, which feels like a snap
 * to completion. No layout shift, no jarring skeleton blocks.
 */
export function TopProgressBar() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="cdn-progress-fill" />
    </div>
  );
}
