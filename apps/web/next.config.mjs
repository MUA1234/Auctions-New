/** @type {import('next').NextConfig} */

// Build the connect-src allow-list from the public env so the browser may only
// reach our own origin, the canonical API and Supabase (auth + storage/SSE).
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseWs = supabaseUrl.replace(/^https:/, 'wss:');
const connectSrc = ["'self'", apiOrigin, supabaseUrl, supabaseWs].filter(Boolean).join(' ');
const imgSrc = ["'self'", 'data:', 'blob:', supabaseUrl].filter(Boolean).join(' ');

// Content Security Policy (anti-clone retrofit doc 02). No `unsafe-eval` in
// production; framing denied; connections restricted to our own services.
// `unsafe-inline` remains for script/style because Next's hydration bootstrap and
// styled-jsx are inline — nonce-based CSP is a documented follow-up. `unsafe-eval`
// is allowed ONLY in development (React-refresh/HMR needs it) and never in prod.
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // §4 — allow the app's OWN origin to use the camera (in-app seller photo capture); still deny
  // it to any embedded third-party frame. Microphone/geolocation/payment stay fully disabled.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  // @singha/ui and @singha/auctionflow are consumed as source (docs/03).
  transpilePackages: ['@singha/ui', '@singha/auctionflow'],
  // Linting is owned by the repo-root flat ESLint config, not `next build`.
  eslint: { ignoreDuringBuilds: true },
  // Anti-clone hardening (doc 01/02): no server fingerprint, no public source maps.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
