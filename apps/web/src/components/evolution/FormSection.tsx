import { type ReactNode } from 'react';
import { cn } from '@singha/ui';

/**
 * Groups related fields under a short plain-English heading (+ optional one-line hint) — used to
 * make multi-field requirement/programme forms (RFQ, Supply Programmes; CX6, pack docs 04/05)
 * read as a short sequence of plain questions ("Item & spec" → "Quantity" → "Timing" → …) instead
 * of one long, undifferentiated technical field dump. A real `<fieldset>`/`<legend>` so assistive
 * tech announces the section name when a field inside it gets focus.
 */
export function FormSection({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('space-y-4 border-0 p-0', className)}>
      <legend className="mb-3 w-full border-b border-white/[0.06] pb-2">
        <span className="block font-display text-sm font-semibold text-bone-200">{title}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs font-normal text-bone-500">{hint}</span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}
