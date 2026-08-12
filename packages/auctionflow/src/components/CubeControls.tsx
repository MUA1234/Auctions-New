'use client';

import type { CSSProperties } from 'react';

/** Prev / next arrows for a Rubik row (doc 04 "Controls: arrows … page indicator"). */
export function CubeControls({
  onPrev,
  onNext,
  disabled,
  label,
  style,
}: {
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
  label: string;
  style?: CSSProperties;
}) {
  return (
    <div style={style} className="af-controls">
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled}
        aria-label={`${label}: previous`}
        className="af-arrow"
      >
        ◀
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        aria-label={`${label}: next`}
        className="af-arrow"
      >
        ▶
      </button>
    </div>
  );
}

/** Max dots before the indicator collapses to a compact counter. */
const MAX_DOTS = 10;

/**
 * Page indicator (doc 04). A dot rail for a handful of pages; past `MAX_DOTS`
 * (e.g. a long mobile row paged one-at-a-time) it collapses to a compact
 * "n / total" counter so the row header can never force horizontal document
 * overflow (Revision 06.1 §28).
 */
export function CubeProgress({
  total,
  current,
  onSelect,
  label,
}: {
  total: number;
  current: number;
  onSelect: (page: number) => void;
  label: string;
}) {
  if (total <= 1) return null;
  if (total > MAX_DOTS) {
    return (
      <span className="af-count" aria-label={`${label}: face ${current + 1} of ${total}`}>
        {current + 1} / {total}
      </span>
    );
  }
  return (
    <div className="af-progress" role="tablist" aria-label={`${label} pages`}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === current}
          aria-label={`${label}: face ${i + 1} of ${total}`}
          onClick={() => onSelect(i)}
          className={i === current ? 'af-dot af-dot-on' : 'af-dot'}
        />
      ))}
    </div>
  );
}
