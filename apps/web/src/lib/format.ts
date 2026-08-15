/** Format integer minor units as a currency string, e.g. 20000000 → "LKR 200,000". */
export function formatMoney(minor: number | null | undefined, currency = 'LKR'): string {
  if (minor == null) return '—';
  return `${currency} ${(minor / 100).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

/** Parse a user-entered major-unit amount (e.g. "200000" or "200,000") to integer minor units. */
export function parseMoneyToMinor(major: string | number): number | null {
  const n = typeof major === 'number' ? major : Number(String(major).replace(/[,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Supported display currencies (mirrors the backend E5 currency catalog). `exp` = minor-unit
 *  exponent (JPY has 0 decimals). Display only — never the binding transaction currency (D5). */
export const CURRENCIES: ReadonlyArray<{ code: string; label: string; exp: number }> = [
  { code: 'LKR', label: 'LKR — Sri Lankan Rupee', exp: 2 },
  { code: 'USD', label: 'USD — US Dollar', exp: 2 },
  { code: 'EUR', label: 'EUR — Euro', exp: 2 },
  { code: 'GBP', label: 'GBP — Pound Sterling', exp: 2 },
  { code: 'AUD', label: 'AUD — Australian Dollar', exp: 2 },
  { code: 'INR', label: 'INR — Indian Rupee', exp: 2 },
  { code: 'AED', label: 'AED — UAE Dirham', exp: 2 },
  { code: 'SGD', label: 'SGD — Singapore Dollar', exp: 2 },
  { code: 'CNY', label: 'CNY — Chinese Yuan', exp: 2 },
  { code: 'JPY', label: 'JPY — Japanese Yen', exp: 0 },
];

const CURRENCY_EXP = new Map(CURRENCIES.map((c) => [c.code, c.exp]));

/** Format integer minor units honoring the currency's exponent (JPY = 0 decimals). */
export function formatMoneyExp(minor: number | null | undefined, currency = 'LKR'): string {
  if (minor == null) return '—';
  const exp = CURRENCY_EXP.get(currency) ?? 2;
  const major = minor / 10 ** exp;
  return `${currency} ${major.toLocaleString('en-LK', { maximumFractionDigits: exp })}`;
}

/** Format a decimal-string quantity (from the backend, e.g. "100" / "12.5") with an optional unit. */
export function formatQuantity(
  qty: string | number | null | undefined,
  unit?: string | null,
): string {
  if (qty == null || qty === '') return '—';
  const n = typeof qty === 'number' ? qty : Number(qty);
  const label = Number.isFinite(n)
    ? n.toLocaleString('en-LK', { maximumFractionDigits: 9 })
    : String(qty);
  return unit ? `${label} ${unit}` : label;
}

/** Short date, e.g. "15 Aug 2026". Null-safe. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Date + time, e.g. "15 Aug 2026, 14:30". Null-safe. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Join structured location parts into one line ("Colombo, Western · LK"). */
export function formatLocation(parts: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  const place = [parts.city, parts.region].filter(Boolean).join(', ');
  if (place && parts.country) return `${place} · ${parts.country}`;
  return place || parts.country || '—';
}

/** Title-case a snake/kebab status token, e.g. "manual_review" → "Manual review". */
export function humanize(token: string | null | undefined): string {
  if (!token) return '—';
  const s = token.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
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
