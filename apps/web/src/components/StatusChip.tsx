import { Chip, type ChipTone } from '@singha/ui';
import { humanize } from '../lib/format';

const WIN = ['won', 'winning', 'accepted', 'active', 'live', 'open', 'verified', 'paid', 'settled'];
const BAD = ['outbid', 'declined', 'rejected', 'withdrawn', 'expired', 'lapsed', 'cancelled'];
const PENDING = [
  'pending',
  'submitted',
  'review',
  'countered',
  'counter',
  'negotiate',
  'shortlist',
];

/** Map a free-text server status to a coloured pill. */
export function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase();
  let tone: ChipTone = 'neutral';
  if (WIN.includes(s)) tone = 'win';
  else if (BAD.includes(s)) tone = 'outbid';
  else if (PENDING.includes(s)) tone = 'gold';
  return <Chip tone={tone}>{humanize(status)}</Chip>;
}
