import './globals.css';
import '@/components/CoachMark.css';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FieldBackground from '@/components/FieldBackground';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL('https://praxisphysics.vercel.app'),
  title: 'Praxis — Physics Lab, Simulated.',
  description:
    'Free interactive physics simulations and past papers for students. Runs in the browser, works on a phone, no account needed to start.',
  openGraph: {
    title: 'Praxis — Physics Lab, Simulated.',
    description:
      'Free interactive physics simulations and past papers for students.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#060A0F',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <FieldBackground />
        <Header />
        <main id="top">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
