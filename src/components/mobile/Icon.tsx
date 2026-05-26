// Inline 24×24 outline icons used by the mobile shell. Centralized here so
// the same set is reachable from TopBar, BottomTabBar, Drawer, and any page
// that needs an icon without pulling a runtime icon library.

const ICON = {
  dashboard: <path d="M4 13h7V4H4v9zm0 7h7v-5H4v5zm9 0h7V11h-7v9zm0-16v5h7V4h-7z" />,
  holdings:  <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />,
  dividends: <path d="M12 3l9 4.5v9L12 21 3 16.5v-9L12 3zm0 2.2L5 8.4v7.2l7 3.2 7-3.2V8.4l-7-3.2z" />,
  perf:      <path d="M3 17l6-6 4 4 8-9-1.4-1.4L13 12 9 8l-7 7L3 17z" />,
  diversification: <path d="M11 11V3.05A9 9 0 0 0 3.05 11H11zm2-7.95V11h7.95A9 9 0 0 0 13 3.05zM3.05 13A9 9 0 1 0 13 21.95V13H3.05z" />,
  bell:      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.91V5a1 1 0 1 0-2 0v.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z" />,
  more:      <circle cx="12" cy="12" r="1.6" />,
  search:    <path d="M10 2a8 8 0 1 1-5.3 14L1 19.7l1.4 1.4L6 17.3A8 8 0 0 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />,
  plus:      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" />,
  menu:      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />,
  chev:      <path d="M9.3 6.3l5.7 5.7-5.7 5.7-1.4-1.4L11.2 12 7.9 7.7z" />,
  user:      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3 0-8 1.5-8 4.5V21h16v-2.5C20 15.5 15 14 12 14z" />,
  tax:       <path d="M5 3h11l3 3v15H5V3zm2 4v2h10V7H7zm0 4v2h10v-2H7zm0 4v2h7v-2H7z" />,
  alerts:    <path d="M12 2a7 7 0 0 0-7 7v4l-2 3v2h18v-2l-2-3V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" />,
  settings:  <path d="M19.4 13a7.5 7.5 0 0 0 .1-1 7.5 7.5 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.9 3h-3.8l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1L11.1 21h3.8l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z" />,
} as const;

export type MobileIconName = keyof typeof ICON;

export function Icon({ name, size = 22 }: { name: MobileIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {ICON[name]}
    </svg>
  );
}
