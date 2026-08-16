import { Chip, type ChipTone } from '@singha/ui';
import { humanize } from '../../lib/format';

/**
 * Shared Singha ID capability presentation (CX7, pack doc 05/11 "Singha ID as a transaction
 * passport"). `fetchCapabilities`/`fetchEvoDashboard` already return customer-safe capability
 * data (`CapabilityGrant.status`, never a risk score or staff note) — this module maps that raw
 * status vocabulary onto ONE friendly, customer-facing state so no surface ever shows a raw
 * enum code. Consumed by both `SinghaIdProfile` (the full passport) and `ExchangeActivity` (the
 * Command Centre's "Needs your attention" + Documents lane), so the same grant always reads the
 * same way in both places.
 */

export type PassportState = 'verified' | 'review' | 'action' | 'none';

/** Statuses that mean the grant was actively refused/withdrawn/lapsed — the customer must act. */
const ACTION_STATUSES = new Set([
  'rejected',
  'declined',
  'expired',
  'revoked',
  'lapsed',
  'cancelled',
]);
/** No grant exists yet (the backend may send an explicit `'none'`, or omit the capability). */
const NONE_STATUSES = new Set(['none']);

/**
 * Classify a capability grant's raw `status` (+ its `expiresAt`) into one of four customer-safe
 * states. Anything we don't recognise (a new backend status word) is treated as "review" —
 * never silently promoted to "verified" or alarmingly flagged as "action needed" — so an unknown
 * token can never overclaim or under-warn.
 */
export function passportState(
  status: string | null | undefined,
  expiresAt?: string | null,
): PassportState {
  if (!status) return 'none';
  const s = status.toLowerCase();
  if (NONE_STATUSES.has(s)) return 'none';
  if (ACTION_STATUSES.has(s)) return 'action';
  if (s === 'verified') {
    // A verified grant with a past expiry is no longer active — the same `expiresAt` field
    // already shown to the customer today (SinghaIdProfile "Expires …") is enough to tell.
    if (expiresAt) {
      const t = new Date(expiresAt).getTime();
      if (Number.isFinite(t) && t <= Date.now()) return 'action';
    }
    return 'verified';
  }
  return 'review';
}

/** True when a verified grant's `expiresAt` falls within the next `days` (default 30). */
export function isExpiringSoon(expiresAt: string | null | undefined, days = 30): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  return t > now && t <= now + days * 24 * 60 * 60 * 1000;
}

export const PASSPORT_STATE_LABEL: Record<PassportState, string> = {
  verified: 'Verified',
  review: 'Under review',
  action: 'Action needed',
  none: 'Not started',
};

const PASSPORT_STATE_TONE: Record<PassportState, ChipTone> = {
  verified: 'win',
  review: 'gold',
  action: 'outbid',
  none: 'neutral',
};

/** The passport-state chip — same colour + wording wherever a capability's state is shown. */
export function PassportStateChip({ state }: { state: PassportState }) {
  return <Chip tone={PASSPORT_STATE_TONE[state]}>{PASSPORT_STATE_LABEL[state]}</Chip>;
}

/**
 * Friendly, sentence-ready labels for the capabilities `SinghaIdProfile` offers today
 * (`place_bid` / `make_offer` / `sell` / `operate_auction` / `export` / `import` /
 * `high_value_trade`). Falls back to `humanize()` for any capability this map hasn't named yet,
 * so a new backend capability never renders as a raw `snake_case` code.
 */
const CAPABILITY_LABELS: Record<string, string> = {
  place_bid: 'Bidding',
  make_offer: 'Making offers',
  sell: 'Selling',
  operate_auction: 'Running auctions',
  export: 'Export trade',
  import: 'Import trade',
  high_value_trade: 'High-value trade',
};
export function capabilityLabel(capability: string): string {
  return CAPABILITY_LABELS[capability] ?? humanize(capability);
}

/** One-line "why this matters" copy for each capability's passport row. */
const CAPABILITY_HINT: Record<string, string> = {
  place_bid: 'Required to place bids in timed and live auctions.',
  make_offer: 'Required to submit private offers on listings.',
  sell: 'Required to list items for sale on Singha.',
  operate_auction: 'Required to run or manage a live auction.',
  export: 'Required for cross-border export transactions.',
  import: 'Required for cross-border import transactions.',
  high_value_trade: 'Required for high-value trade transactions.',
};
export function capabilityHint(capability: string): string {
  return CAPABILITY_HINT[capability] ?? 'Required for this activity on Singha.';
}

/** Plain next-step copy for a passport row, given its state and (already-friendly) label. */
export function passportNextStep(state: PassportState, label: string): string {
  const lower = label.toLowerCase();
  switch (state) {
    case 'verified':
      return `You're set — ${lower} is active on your account.`;
    case 'review':
      return `We're reviewing your request. No action needed right now.`;
    case 'action':
      return `This needs your attention — send the request again or contact support.`;
    case 'none':
    default:
      return `Not started. Request access to start ${lower}.`;
  }
}
