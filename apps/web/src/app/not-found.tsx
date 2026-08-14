import Link from 'next/link';
import { Button } from '@singha/ui';

/**
 * Global 404 (V3-1). A styled, on-brand not-found rather than the default Next page,
 * pointing back to the catalogue and home.
 */
export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="font-display text-6xl font-bold tracking-tight text-gold-400/90">404</p>
      <h1 className="max-w-xl font-serif text-3xl font-bold text-bone sm:text-4xl">
        This page couldn’t be found
      </h1>
      <p className="max-w-md text-bone-400">
        The lot or page may have closed or moved. Explore the live catalogue to find what’s open
        now.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/catalogue">
          <Button variant="primary">Browse catalogue</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
