'use client';

import Link from 'next/link';
import { useFlags } from '../lib/use-flags';

/**
 * Compact collection/delivery affordance woven into the lot detail transaction journey (CX8,
 * pack doc 05 "Logistics"). Two independent, additive pieces:
 *  - A pickup/collection line — plain listing data (`collectionSummary` when the backend has
 *    it, else a line built from the lot's own `location`). Never gated on an Evolution flag:
 *    it is not an Evolution capability, just the listing's own logistics facts.
 *  - A "Get a delivery estimate" entry into the full Singha Logistics centre
 *    (`/services/logistics`, E7) — gated on the `logistics` flag, the same gate `EvoGate`
 *    enforces on that destination page, so this new entry point never invites a visitor to a
 *    surface that is switched off for them. It is a PLAIN link, not a pre-filled deep link:
 *    neither `/services/logistics` nor `LogisticsCentre` reads any query params today, so a
 *    prefilled `?origin=`/`?destination=` would silently do nothing.
 * Renders nothing when it would have nothing to say (no pickup line AND the flag is off) —
 * the same "graceful hide" convention already used by other flag-gated entry points
 * (`EvolutionEntryLinks`).
 */
export function LotLogisticsHint({
  collectionSummary,
  place,
}: {
  collectionSummary?: string | null;
  place?: string;
}) {
  const { flags } = useFlags();
  const hasPickupLine = Boolean(collectionSummary || place);

  if (!hasPickupLine && !flags.logistics) return null;

  return (
    <section aria-labelledby="lot-logistics-heading" className="mt-5">
      <h2 id="lot-logistics-heading" className="font-display text-sm font-semibold text-bone">
        Collection &amp; delivery
      </h2>

      {collectionSummary ? (
        <p className="mt-2 break-words text-sm leading-relaxed text-bone-300">
          <span className="text-bone-500">Pickup </span>
          {collectionSummary}
        </p>
      ) : place ? (
        <p className="mt-2 text-sm leading-relaxed text-bone-300">
          Collection can be arranged in <span className="text-bone-200">{place}</span>.
        </p>
      ) : null}

      {flags.logistics && (
        <>
          <Link
            href="/services/logistics"
            className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
          >
            Get a delivery estimate
            <span aria-hidden>→</span>
          </Link>
          <p className="mt-1 text-xs text-bone-500">
            Indicative freight quote from Singha Logistics — not a booking.
          </p>
        </>
      )}
    </section>
  );
}
