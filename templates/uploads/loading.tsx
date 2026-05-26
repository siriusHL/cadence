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

// Applies the user's contrast + background-tone preferences before first paint
// so the page never flashes the default palette on reload.
const visualPrefsBootScript = `
(function(){try{
  var d = document.documentElement;
  var m = document.cookie.match(/(?:^|; )contrast=(soft|standard|sharp)/);
  if (m && m[1] !== 'standard') d.setAttribute('data-contrast', m[1]);
  var t = document.cookie.match(/(?:^|; )bg_tone=(cream|neutral|cool)/);
  if (t && t[1] !== 'cream') d.setAttribute('data-bg-tone', t[1]);
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: visualPrefsBootScript }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
