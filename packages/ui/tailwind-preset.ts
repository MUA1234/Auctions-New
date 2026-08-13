import type { Config } from 'tailwindcss';

/**
 * Singha Auctions design system — "Auction-House Luxe" (ported from V1).
 * Cinematic warm near-black (coal) base, warm off-white (bone) text, Singha-green
 * primary / live energy, luxe-gold prestige for prices & reserve-met, plus a
 * gaming/HUD layer (angular clips, grid, glow). Consumed as a Tailwind PRESET so
 * every app shares one source of truth for colour and type.
 */
const preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Coal — warm near-black surfaces (primary background system)
        coal: {
          950: '#09090a',
          900: '#101011',
          850: '#161618',
          800: '#1c1c1f',
          750: '#232327',
          700: '#2b2b30',
          600: '#38383f',
          500: '#4a4a52',
        },
        // Bone — warm off-white text ramp (light on dark)
        bone: {
          DEFAULT: '#f7f3ea',
          100: '#f7f3ea',
          200: '#e9e4d8',
          300: '#cfc9ba',
          400: '#a6a094',
          500: '#807a6e',
          600: '#5f5a50',
        },
        // Green — the Singha primary action / live energy (emerald ramp).
        // Kept under the `red` token name so every existing bg-red-*/text-red-*
        // utility flips to green with no missed references.
        red: {
          50: '#e9f7ef',
          100: '#c9edd8',
          300: '#63c691',
          400: '#34b06f',
          500: '#1fa055',
          600: '#178546',
          700: '#126a37',
          800: '#0d5228',
        },
        // Gold — luxe prestige: prices, reserve-met, premium accents
        gold: {
          50: '#faf3df',
          100: '#f3e6c2',
          200: '#e7d199',
          300: '#dcbd76',
          400: '#d9b25e',
          500: '#c9a24b',
          600: '#a9863a',
          700: '#87692c',
        },
        // Live-market semantics
        live: '#1fa055',
        win: '#2fae7a',
        outbid: '#e8933c',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Manrope', 'var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 18px 40px -24px rgba(0,0,0,0.8)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.5), 0 40px 80px -32px rgba(0,0,0,0.9)',
        glow: '0 10px 34px -12px rgba(31,160,85,0.55)',
        'red-glow': '0 10px 34px -12px rgba(31,160,85,0.55)',
        'gold-glow': '0 10px 34px -12px rgba(201,162,75,0.45)',
        'live-glow': '0 0 0 1px rgba(31,160,85,0.4), 0 10px 40px -12px rgba(31,160,85,0.5)',
        soft: '0 2px 12px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      backgroundImage: {
        'coal-fade': 'linear-gradient(160deg,#1c1c1f 0%,#101011 55%,#09090a 100%)',
        'gold-fade': 'linear-gradient(135deg,#d9b25e 0%,#c9a24b 55%,#a9863a 100%)',
        'red-fade': 'linear-gradient(135deg,#34b06f 0%,#1fa055 55%,#178546 100%)',
        'red-glow-radial':
          'radial-gradient(60% 60% at 70% 20%, rgba(31,160,85,0.28), transparent 70%)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(31,160,85,0.5)' },
          '70%': { boxShadow: '0 0 0 12px rgba(31,160,85,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(31,160,85,0)' },
        },
        'bid-pop': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'float-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slow-pan': {
          '0%': { transform: 'scale(1.08) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.14) translate3d(-1.5%,-1.5%,0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
        'bid-pop': 'bid-pop 0.4s ease-out',
        shimmer: 'shimmer 1.6s infinite',
        'float-in': 'float-in 0.5s ease-out both',
        'slow-pan': 'slow-pan 26s ease-in-out infinite alternate',
      },
    },
  },
};

export default preset;
