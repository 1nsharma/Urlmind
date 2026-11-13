import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'URLMIND — URL to Interactive Intelligence',
  description:
    'Turn any URL into an interactive visual architecture map, sitemap, tech stack audit, 60-second explainer, and intelligence report.',
  openGraph: {
    title: 'URLMIND — URL to Interactive Intelligence',
    description:
      'Turn any URL into an interactive visual architecture map, sitemap, tech stack audit, 60-second explainer, and intelligence report.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'URLMIND — URL to Interactive Intelligence',
    description:
      'Turn any URL into an interactive visual architecture map, sitemap, tech stack audit, 60-second explainer, and intelligence report.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
