'use client';

import { formatMoney } from '../lib/format';
import { useFlags } from '../lib/use-flags';

const CTA: Record<string, string> = {
  TIMED_AUCTION: 'Place bid',
  BUY_NOW: 'Buy now',
  MAKE_OFFER: 'Make offer',
  SEALED_TENDER: 'Submit tender',
  EXPRESSION_OF_INTEREST: 'Register interest',
  LIVE_HYBRID: 'Place bid',
};

const LABEL: Record<string, string> = {
  TIMED_AUCTION: 'Current bid',
  BUY_NOW: 'Buy now',
  MAKE_OFFER: 'Guide',
  SEALED_TENDER: 'Guide',
  EXPRESSION_OF_INTEREST: 'Guide',
  LIVE_HYBRID: 'Current bid',
};

/**
 * Mobile sticky action dock (V3 lot detail). On phones the bid/sale panel sits far
 * below the media, so the key state + primary action are always within reach at the
 * bottom of the viewport. It never places a bid itself — the CTA anchors to the real
 * panel (`#lot-action`) where the binding action has proper size, context and the
 * server-authoritative confirmation. Desktop keeps the sticky side panel (`lg:hidden`).
 */
export function LotStickyDock({
  priceMinor,
  currency,
  saleMethod,
  targetId = 'lot-action',
}: {
  priceMinor: number | null;
  currency: string;
  saleMethod: string;
  targetId?: string;
}) {
  const { flags } = useFlags();
  const cta = CTA[saleMethod] ?? 'View lot';
  const label = LABEL[saleMethod] ?? 'Price';
  // When the neutral-IA mobile bottom dock is active, it owns the very bottom of small
  // viewports (< md). Sit this action dock directly above it there; from md up (where the
  // nav dock is hidden) return to the screen edge. Prevents the two fixed bars colliding.
  const position = flags.neutralIaV1
    ? 'bottom-[calc(3.75rem_+_env(safe-area-inset-bottom))] pb-0 md:bottom-0 md:pb-[env(safe-area-inset-bottom)]'
    : 'bottom-0 pb-[env(safe-area-inset-bottom)]';
  return (
    <div
      className={`fixed inset-x-0 z-40 border-t border-white/10 bg-coal-950/90 backdrop-blur-xl lg:hidden ${position}`}
    >
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-bone-500">{label}</p>
          <p className="tabular truncate font-display text-lg font-bold text-gold-400">
            {priceMinor != null ? formatMoney(priceMinor, currency) : 'View'}
          </p>
        </div>
        <a href={`#${targetId}`} className="btn-primary shrink-0">
          {cta}
        </a>
      </div>
    </div>
  );
}
