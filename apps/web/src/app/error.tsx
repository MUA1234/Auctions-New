'use client';

import { useEffect } from 'react';
import { Button } from '@singha/ui';

/**
 * Global error boundary (V3-1). Keeps a failed render inside the premium shell with a
 * clear recovery path instead of a raw stack. Never leaks error internals to the UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console for local debugging; production monitoring is server-side.
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="max-w-xl font-serif text-3xl font-bold text-bone sm:text-4xl">
        We hit an unexpected error
      </h1>
      <p className="max-w-md text-bone-400">
        The page couldn’t be displayed. Your account, bids and payments are unaffected — auction
        state is server-authoritative and never depends on this screen.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <a href="/">
          <Button variant="outline">Back to home</Button>
        </a>
      </div>
    </div>
  );
}
