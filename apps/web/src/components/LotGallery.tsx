'use client';

import { useState } from 'react';
import type { PublicMedia } from '../lib/api';
import { mediaUrl } from '../lib/media';
import { LotImage } from './LotImage';

/**
 * Lot detail gallery (pack doc 08): a large cover plus a thumbnail strip.
 * Images only — catalogue/detail never streams a heavy original video; a video
 * present is surfaced as a badge. Degrades to a single placeholder when a lot
 * has no media yet.
 */
export function LotGallery({ media, title }: { media: PublicMedia[]; title: string }) {
  const images = media.filter((m) => m.kind !== 'video');
  const hasVideo = media.some((m) => m.kind === 'video');
  const [active, setActive] = useState(0);
  const cover = images[active] ?? images[0];

  return (
    <div>
      <div className="hud-cut relative overflow-hidden rounded-lg">
        <LotImage
          src={mediaUrl(cover?.storageKey)}
          alt={cover?.caption ?? title}
          aspect="aspect-[16/10]"
        />
        {hasVideo && (
          <span className="absolute bottom-3 right-3 rounded bg-coal-950/80 px-2 py-1 text-xs text-bone-200">
            ▶ Video available
          </span>
        )}
      </div>
      {images.length > 1 && (
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
    </div>
  );
}
