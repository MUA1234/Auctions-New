/** Format integer minor units as a currency string, e.g. 20000000 → "LKR 200,000". */
export function formatMoney(minor: number | null | undefined, currency = 'LKR'): string {
  if (minor == null) return '—';
  return `${currency} ${(minor / 100).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

/** Human "time left" until an ISO timestamp. */
export function timeLeft(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}
