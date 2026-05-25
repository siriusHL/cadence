import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import './pro.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Cadence — Dividend portfolio tracker',
  description: 'Track dividends, forecast income, see your money working.',
};

// Runs synchronously before the first paint so the theme is in place before
// any CSS is applied — eliminates the dark-mode flash on reload.
const themeBootScript = `
(function(){try{
  var m = document.cookie.match(/(?:^|; )theme=(light|dark|system)/);
  var t = m ? m[1] : 'system';
  if (t === 'system') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
