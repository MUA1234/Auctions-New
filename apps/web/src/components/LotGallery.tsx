'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicMedia } from '../lib/api';
import { mediaUrl } from '../lib/media';
import { LotImage } from './LotImage';

/**
 * Lot detail gallery (pack doc 08 / directive §17): a large cover with prev/next arrows, a
 * thumbnail strip, mobile swipe, keyboard navigation, a zoom/fullscreen lightbox, and inline video
 * playback when a video original is present (degrades to a placeholder when a lot has no media).
 * The screen is never the source of truth — this is presentation only.
 */
export function LotGallery({ media, title }: { media: PublicMedia[]; title: string }) {
  const images = media.filter((m) => m.kind !== 'video');
  const video = media.find((m) => m.kind === 'video');
  const videoUrl = mediaUrl(video?.storageKey);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<null | 'image' | 'video'>(null);
  const touchX = useRef<number | null>(null);

  const count = images.length;
  const cover = images[active] ?? images[0];
  const go = useCallback(
    (dir: number) => setActive((i) => (count ? (i + dir + count) % count : 0)),
    [count],
  );

  // Keyboard: arrows navigate, Escape closes the lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (lightbox === 'image' && e.key === 'ArrowLeft') go(-1);
      else if (lightbox === 'image' && e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, go]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || count < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const arrowBtn =
    'absolute top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-coal-950/70 text-bone-100 ' +
    'backdrop-blur transition hover:bg-coal-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500';

  return (
    <div>
      <div
        className="hud-cut group relative overflow-hidden rounded-lg"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => cover && setLightbox('image')}
          aria-label="Zoom image"
          className="block w-full cursor-zoom-in"
        >
          <LotImage
            src={mediaUrl(cover?.storageKey)}
            alt={cover?.caption ?? title}
            aspect="aspect-[16/10]"
          />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className={`${arrowBtn} left-3`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className={`${arrowBtn} right-3`}
            >
              ›
            </button>
            <span className="absolute bottom-3 left-3 rounded bg-coal-950/80 px-2 py-1 text-xs text-bone-200">
              {active + 1} / {count}
            </span>
          </>
        )}

        {video && (
          <button
            type="button"
            onClick={() => setLightbox('video')}
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded bg-coal-950/80 px-2 py-1 text-xs text-bone-100 hover:bg-coal-950"
          >
            ▶ Play video
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border transition-colors ${
                i === active ? 'border-gold-500' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <LotImage src={mediaUrl(m.storageKey)} alt={m.caption ?? ''} aspect="h-16 w-20" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-coal-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox === 'video' ? 'Video' : 'Image viewer'}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl text-bone-100 hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          {lightbox === 'video' && videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="max-h-[85vh] max-w-[92vw] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    className={`${arrowBtn} left-4`}
                    onClick={(e) => {
                      e.stopPropagation();
                      go(-1);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    className={`${arrowBtn} right-4`}
                    onClick={(e) => {
                      e.stopPropagation();
                      go(1);
                    }}
                  >
                    ›
                  </button>
                </>
              )}
              <img
                src={mediaUrl(cover?.storageKey) ?? ''}
                alt={cover?.caption ?? title}
                className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
