import type { Metadata, Viewport } from 'next';
import { Poppins, Inter, Manrope } from 'next/font/google';
import '@singha/ui/styles.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

// Headings — rounded geometric sans on the --font-serif variable (matches V1).
const heading = Poppins({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
// Product names + prices — a grotesque with tabular figures.
const display = Manrope({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

const TITLE = 'Singha — Find, sell and source valuable assets & commodities';
const DESCRIPTION =
  'Singha is where valuable physical assets and commodities are discovered, sold, sourced and settled — through offers, buy now, tenders and auctions, with transparent, server-authoritative records.';

export const metadata: Metadata = {
  title: { default: TITLE, template: '%s · Singha' },
  description: DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: '#09090a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${heading.variable} ${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col text-bone">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
