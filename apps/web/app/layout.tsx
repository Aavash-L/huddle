import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Huddle — Plans that actually happen',
    template: '%s | Huddle',
  },
  description:
    'Plans go to die in the group chat. Huddle is where they actually happen.',
  openGraph: {
    type: 'website',
    siteName: 'Huddle',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Huddle',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F2027',
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
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
