'use client';
import { type ReactElement } from 'react';
import { Chip, cn } from '@singha/ui';
import { humanize } from '../../lib/format';

/** True for a plain JSON object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A returned decision string an operator must not miss, e.g. "MANUAL_REVIEW_REQUIRED". */
export function needsReview(value: unknown): boolean {
  return typeof value === 'string' && /MANUAL_REVIEW/i.test(value);
}

/** Render a single arbitrary value (primitive, array or nested object) readably. */
function Value({ value }: { value: unknown }): ReactElement {
  if (value === null || value === undefined) return <span className="text-bone-500">—</span>;
  if (typeof value === 'boolean')
    return <span className={value ? 'text-red-300' : 'text-bone-500'}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number')
    return <span className="tabular text-bone-200">{value.toLocaleString('en-LK')}</span>;
  if (typeof value === 'string')
    return needsReview(value) ? (
      <Chip tone="outbid">{value.replace(/_/g, ' ')}</Chip>
    ) : (
      <span className="break-words text-bone-200">{value}</span>
    );
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-bone-500">None</span>;
    const primitive = value.every((item) => !isRecord(item) && !Array.isArray(item));
    if (primitive)
      return (
        <span className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Chip key={i}>{String(item)}</Chip>
          ))}
        </span>
      );
    return (
      <div className="flex flex-col gap-2">
        {value.map((item, i) => (
          <div key={i} className="hud-cut-xs border border-white/[0.06] bg-coal-900/40 p-2">
            <Value value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (isRecord(value)) return <Rows record={value} />;
  return <span className="text-bone-200">{String(value)}</span>;
}

/** Render an object's entries as labelled key/value rows; review values are visually flagged. */
function Rows({ record }: { record: Record<string, unknown> }): ReactElement {
  const entries = Object.entries(record);
  if (entries.length === 0) return <span className="text-bone-500">—</span>;
  return (
    <dl className="flex flex-col gap-2">
      {entries.map(([key, value]) => {
        const review = needsReview(value);
        return (
          <div
            key={key}
            className={cn(
              'hud-cut-xs grid grid-cols-[minmax(6.5rem,11rem)_1fr] items-start gap-3 border px-3 py-2',
              review
                ? 'border-outbid/40 bg-[#e8933c]/[0.06]'
                : 'border-white/[0.06] bg-white/[0.02]',
            )}
          >
            <dt className="eyebrow text-bone-500">{humanize(key)}</dt>
            <dd className="min-w-0 text-sm">
              <Value value={value} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Render an arbitrary returned record (a deterministic engine decision) as a readable key/value
 * list. Nested objects and arrays are handled reasonably, so a new backend field appears
 * automatically without a code change, and MANUAL_REVIEW_REQUIRED is highlighted wherever it lands.
 */
export function RecordView({ record }: { record: unknown }): ReactElement {
  if (isRecord(record)) return <Rows record={record} />;
  return (
    <div className="text-sm">
      <Value value={record} />
    </div>
  );
}
