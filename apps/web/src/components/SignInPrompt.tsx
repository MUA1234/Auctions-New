import Link from 'next/link';
import { Button } from '@singha/ui';

/**
 * A polished, vertically-centred signed-out gate. Private surfaces (dashboard,
 * account, bid capacity, seller area) render this when there is no session so the
 * page reads as intentional — a clear call to sign in — instead of a lonely card
 * floating in an empty screen.
 */
export function SignInPrompt({
  title,
  description,
  next,
  cta = 'Sign in',
}: {
  title: string;
  description: string;
  next: string;
  cta?: string;
}) {
  return (
    <div className="flex min-h-[52vh] flex-col items-center justify-center px-4 py-16 text-center">
      <span
        aria-hidden
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] text-amber-200"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <h2 className="font-serif text-2xl font-bold text-bone">{title}</h2>
      <p className="mt-2 max-w-md text-balance text-bone-400">{description}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
        <Link href={`/login?next=${encodeURIComponent(next)}`}>
          <Button variant="gold">{cta}</Button>
        </Link>
        <Link href="/catalogue" className="text-sm font-medium text-bone-400 hover:text-bone">
          Browse the catalogue →
        </Link>
      </div>
    </div>
  );
}
