import type { Config } from 'tailwindcss';
import preset from '@singha/ui/tailwind-preset';

/**
 * Web Tailwind config. Colour + type come from the shared @singha/ui preset so
 * the whole platform stays visually consistent. Content scans the app plus the
 * UI/AuctionFlow source packages that ship class names.
 */
const config: Config = {
  darkMode: 'class',
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/auctionflow/src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
