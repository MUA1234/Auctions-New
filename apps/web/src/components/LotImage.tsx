'use client';

import { useState } from 'react';

/**
 * Real asset photography with a graceful placeholder (pack docs 07/15 "real
 * cover media"). Falls back to the house gradient when there is no media yet or
 * the image fails to load, so a lot without photos still looks intentional
 * rather than broken. Uses a plain lazy <img> — catalogue cards must never
 * autoplay video or block on hero-weight images.
 */
export function LotImage({
  src,
  alt,
  className = '',
  aspect = 'aspect-[4/3]',
}: {
  src: string | null;
  alt: string;
  className?: string;
  aspect?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-br from-coal-700/60 to-coal-900/80 ${aspect} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center text-bone-700"
          aria-hidden
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
            <path d="m21 15-5-5L5 21" strokeWidth="1.5" />
          </svg>
        </span>
      )}
    </div>
  );
}
