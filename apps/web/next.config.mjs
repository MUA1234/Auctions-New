/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @singha/ui and @singha/auctionflow are consumed as source (docs/03).
  transpilePackages: ['@singha/ui', '@singha/auctionflow'],
  // Linting is owned by the repo-root flat ESLint config, not `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
