import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://huddle.app';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Huddle — Plans that actually happen',
    template: '%s | Huddle',
  },
  description:
    'Plans go to die in the group chat. Huddle locks them in. Free to start, no email needed.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Huddle',
    locale: 'en_US',
    title: 'Huddle — Plans that actually happen',
    description:
      'Plans go to die in the group chat. Huddle locks them in. Free to start, no email needed.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Huddle — Plans that actually happen',
    description:
      'Plans go to die in the group chat. Huddle locks them in. Free to start, no email needed.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Huddle',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0E14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${bricolage.variable} ${inter.variable}`}
    >
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
