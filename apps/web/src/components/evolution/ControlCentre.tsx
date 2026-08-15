'use client';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  Chip,
  DataTable,
  Field,
  Select,
  Skeleton,
  Stat,
  Tabs,
  TextInput,
  type ChipTone,
  type Column,
  type SelectOption,
  type StatTone,
  type TabItem,
} from '@singha/ui';
import { useAuth } from '../../lib/auth';
import { useFlags } from '../../lib/use-flags';
import { humanize, parseMoneyToMinor } from '../../lib/format';
import {
  computeFees,
  decideCapability,
  fetchControlCentre,
  insightRisk,
  resolvePaymentRoute,
  resolveRouting,
  type ControlCentreOverview,
  type RiskAssessment,
} from '../../lib/evolution-api';
import { StatusChip } from '../StatusChip';
import { CurrencyAmountInput } from './CurrencyAmountInput';
import { Price } from './Price';
import { RecordView, isRecord } from './RecordView';
import { friendlyError } from './evo-api-error';

const TABS: TabItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'routing', label: 'Routing' },
  { key: 'fees', label: 'Fees & Tax' },
  { key: 'payments', label: 'Payments' },
  { key: 'risk', label: 'Risk' },
  { key: 'kyc', label: 'KYC' },
];

/**
 * Operator Control Centre (E11). One authoritative console over the neutral platform. The page is
 * wrapped by `<EvoGate flag="controlCentre">` + `<MfaGate requireEnrollment>`; here we additionally
 * let the server authorize every call — a 403 surfaces inline as "You don't have operator access."
 * (there is no client-side role boolean) and each sub-tab is gated by its own capability flag.
 */
export function ControlCentre() {
  const { token, loading } = useAuth();
  const { flags } = useFlags();
  const [active, setActive] = useState('overview');

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Singha Evolution · Operator</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-bone">Operator Control Centre</h1>
        <p className="mt-2 max-w-2xl text-sm text-bone-400">
          One authoritative console over the neutral platform — operators, markets, routing, fees,
          payments, risk signals and member verification. Every action is authorized on the server;
          the UI is never the source of truth.
        </p>
      </header>

      {loading ? (
        <div className="mt-8 flex flex-col gap-4">
          <Skeleton className="h-9 w-72 rounded" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : !token ? (
        <Card className="mt-8 max-w-lg">
          <p className="font-serif text-lg text-bone-200">Operator access required</p>
          <p className="mt-2 text-sm text-bone-500">
            Sign in with an operator account to use the Control Centre. Access is authorized by the
            server — there is no client-side role switch.
          </p>
          <Link href="/login?next=/control-centre" className="mt-4 inline-block">
            <Button variant="gold">Sign in</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="mt-8">
            <Tabs tabs={TABS} active={active} onChange={setActive} />
          </div>
          <div className="mt-6">
            {active === 'overview' && <OverviewTab token={token} />}
            {active === 'routing' &&
              (flags.transactionRouting ? (
                <RoutingTab token={token} />
              ) : (
                <NotEnabled name="Transaction routing" />
              ))}
            {active === 'fees' &&
              (flags.feesEngine ? (
                <FeesTab token={token} />
              ) : (
                <NotEnabled name="Fees & tax engine" />
              ))}
            {active === 'payments' &&
              (flags.operatorPayments ? (
                <PaymentsTab token={token} />
              ) : (
                <NotEnabled name="Operator payments" />
              ))}
            {active === 'risk' &&
              (flags.insightEngine ? (
                <RiskTab token={token} />
              ) : (
                <NotEnabled name="Risk insight" />
              ))}
            {active === 'kyc' &&
              (flags.singhaId ? (
                <KycTab token={token} />
              ) : (
                <NotEnabled name="Member verification" />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Calm in-tab fallback when a sub-capability flag is OFF (the URL still resolves). */
function NotEnabled({ name }: { name: string }) {
  return (
    <Card>
      <p className="eyebrow text-bone-500">Not enabled</p>
      <p className="mt-2 text-sm text-bone-400">
        <span className="font-semibold text-bone-200">{name}</span> is part of the Singha Evolution
        rollout and is currently switched off for your account.
      </p>
    </Card>
  );
}

/* ------------------------------ Overview ------------------------------ */

const COUNT_TILES: ReadonlyArray<{ key: keyof ControlCentreOverview['counts']; label: string }> = [
  { key: 'operators', label: 'Operators' },
  { key: 'markets', label: 'Markets' },
  { key: 'routingRules', label: 'Routing rules' },
  { key: 'feeRules', label: 'Fee rules' },
  { key: 'paymentRoutes', label: 'Payment routes' },
  { key: 'supplyProgrammes', label: 'Supply programmes' },
  { key: 'procurementRequests', label: 'Procurement requests' },
  { key: 'pendingVerifications', label: 'Pending verifications' },
];

function OverviewTab({ token }: { token: string }) {
  const [codeInput, setCodeInput] = useState('');
  const [applied, setApplied] = useState('');
  const [data, setData] = useState<ControlCentreOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchControlCentre(token, applied || undefined)
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => alive && setError(friendlyError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, applied, reloadKey]);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    setApplied(codeInput.trim());
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <Field
          label="Operator scope"
          hint="Filter every count to one operator code. Leave blank for the whole platform."
          className="w-full max-w-xs"
        >
          <TextInput
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. SING-OP-01"
          />
        </Field>
        <Button type="submit" variant="outline">
          Apply
        </Button>
        {applied ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCodeInput('');
              setApplied('');
            }}
          >
            Clear
          </Button>
        ) : null}
        <span className="ml-auto self-center">
          <Chip tone={applied ? 'gold' : 'neutral'}>
            {applied ? `Scoped · ${applied}` : 'All operators'}
          </Chip>
        </span>
      </form>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error && !data ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-sm text-outbid" role="alert">
            {error}
          </p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COUNT_TILES.map((tile) => {
              const value = data.counts[tile.key];
              const tone: StatTone =
                tile.key === 'pendingVerifications' && value > 0 ? 'amber' : 'default';
              return <Stat key={tile.key} label={tile.label} value={value} tone={tone} />;
            })}
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <p className="eyebrow text-bone-500">Alerts</p>
              <Chip tone={data.alerts.length > 0 ? 'outbid' : 'win'}>
                {data.alerts.length > 0 ? `${data.alerts.length} to review` : 'All clear'}
              </Chip>
            </div>
            {data.alerts.length === 0 ? (
              <p className="mt-3 text-sm text-bone-500">
                No operator alerts right now. Pending verifications and routing gaps surface here.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {data.alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-bone-200">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-outbid"
                      aria-hidden
                    />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------ Shared form shell ------------------------------ */

function FormTabShell({
  title,
  blurb,
  note,
  onSubmit,
  busy,
  submitLabel,
  fields,
  error,
  result,
}: {
  title: string;
  blurb: string;
  note?: ReactNode;
  onSubmit: (e: FormEvent) => void;
  busy: boolean;
  submitLabel: string;
  fields: ReactNode;
  error: string | null;
  result: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
      <form onSubmit={onSubmit}>
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-xl text-bone">{title}</h2>
            <p className="mt-1 text-sm text-bone-500">{blurb}</p>
          </div>
          {fields}
          {error ? (
            <p className="text-sm text-outbid" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="gold" disabled={busy}>
            {busy ? 'Working…' : submitLabel}
          </Button>
          {note ? <p className="text-xs text-bone-500">{note}</p> : null}
        </Card>
      </form>
      <div>
        {result ? (
          <Card className="flex flex-col gap-3">
            <p className="eyebrow text-bone-500">Result</p>
            {result}
          </Card>
        ) : (
          <Card className="flex min-h-[12rem] items-center justify-center text-center">
            <p className="max-w-xs text-sm text-bone-500">
              Submit the form to see the deterministic decision. The engine result is rendered
              exactly as returned — nothing is committed.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

const SALE_METHODS: SelectOption[] = [
  { value: '', label: 'Any sale method' },
  { value: 'TIMED_AUCTION', label: 'Timed auction' },
  { value: 'BUY_NOW', label: 'Buy now' },
  { value: 'MAKE_OFFER', label: 'Make offer' },
  { value: 'SEALED_TENDER', label: 'Sealed tender' },
  { value: 'EOI', label: 'Expression of interest' },
  { value: 'COMMERCIAL_OFFER', label: 'Commercial offer' },
];

/* ------------------------------ Routing (E6) ------------------------------ */

function RoutingTab({ token }: { token: string }) {
  const [saleMethod, setSaleMethod] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [sellerCountry, setSellerCountry] = useState('');
  const [marketCode, setMarketCode] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const amountMinor = amount ? parseMoneyToMinor(amount) : null;
      const body: Record<string, unknown> = {
        ...(saleMethod ? { saleMethod } : {}),
        ...(category ? { category } : {}),
        ...(amountMinor != null ? { amountMinor, currency } : {}),
        ...(buyerCountry ? { buyerCountry: buyerCountry.toUpperCase() } : {}),
        ...(sellerCountry ? { sellerCountry: sellerCountry.toUpperCase() } : {}),
        ...(marketCode ? { marketCode } : {}),
      };
      setResult(await resolveRouting(body, token));
    } catch (err) {
      setError(friendlyError(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormTabShell
      title="Routing decision"
      blurb="Preview the deterministic route and terms the engine would apply. Read-only — MANUAL_REVIEW_REQUIRED is flagged."
      onSubmit={submit}
      busy={busy}
      submitLabel="Resolve routing"
      error={error}
      result={result ? <RecordView record={result} /> : null}
      fields={
        <>
          <Field label="Sale method">
            <Select
              options={SALE_METHODS}
              value={saleMethod}
              onChange={(e) => setSaleMethod(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <TextInput
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. vehicles"
            />
          </Field>
          <Field label="Transaction amount" hint="Optional. Binding currency for this simulation.">
            <CurrencyAmountInput
              amount={amount}
              currency={currency}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buyer country">
              <TextInput
                value={buyerCountry}
                onChange={(e) => setBuyerCountry(e.target.value)}
                placeholder="ISO-2, e.g. LK"
              />
            </Field>
            <Field label="Seller country">
              <TextInput
                value={sellerCountry}
                onChange={(e) => setSellerCountry(e.target.value)}
                placeholder="ISO-2, e.g. AE"
              />
            </Field>
          </div>
          <Field label="Market code">
            <TextInput
              value={marketCode}
              onChange={(e) => setMarketCode(e.target.value)}
              placeholder="e.g. LK-CORE"
            />
          </Field>
        </>
      }
    />
  );
}

/* ------------------------------ Fees & tax (E8) ------------------------------ */

function FeesTab({ token }: { token: string }) {
  const [saleMethod, setSaleMethod] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [resultCurrency, setResultCurrency] = useState('LKR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amountMinor = parseMoneyToMinor(amount);
    if (amountMinor == null) {
      setError('Enter a transaction amount to compute fees.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        amountMinor,
        currency,
        ...(saleMethod ? { saleMethod } : {}),
        ...(category ? { category } : {}),
        ...(buyerCountry ? { buyerCountry: buyerCountry.toUpperCase() } : {}),
      };
      const res = await computeFees(body, token);
      setResult(res);
      setResultCurrency(currency);
    } catch (err) {
      setError(friendlyError(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormTabShell
      title="Fees & tax"
      blurb="Compute the fee and tax breakdown for a transaction amount. Line items and totals are rendered from the engine response."
      onSubmit={submit}
      busy={busy}
      submitLabel="Compute fees"
      error={error}
      result={result ? <FeesResult result={result} currency={resultCurrency} /> : null}
      fields={
        <>
          <Field label="Transaction amount" required>
            <CurrencyAmountInput
              amount={amount}
              currency={currency}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
            />
          </Field>
          <Field label="Sale method">
            <Select
              options={SALE_METHODS}
              value={saleMethod}
              onChange={(e) => setSaleMethod(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <TextInput
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. vehicles"
            />
          </Field>
          <Field label="Buyer country">
            <TextInput
              value={buyerCountry}
              onChange={(e) => setBuyerCountry(e.target.value)}
              placeholder="ISO-2, e.g. LK"
            />
          </Field>
        </>
      }
    />
  );
}

/** Render a fee/tax response: the first object-array field as a DataTable, `*Minor` scalars as totals. */
function FeesResult({ result, currency }: { result: Record<string, unknown>; currency: string }) {
  const entries = Object.entries(result);
  const lineEntry = entries.find(
    ([, v]) => Array.isArray(v) && v.length > 0 && v.every((item) => isRecord(item)),
  );
  const lines: Record<string, unknown>[] = lineEntry
    ? (lineEntry[1] as Record<string, unknown>[])
    : [];
  const totals = entries.filter(
    ([key, v]) => /minor$/i.test(key) && typeof v === 'number',
  ) as Array<[string, number]>;

  const keys = Array.from(new Set(lines.flatMap((line) => Object.keys(line))));
  const columns: Column<Record<string, unknown>>[] = keys.map((k) => ({
    key: k,
    header: humanize(k),
    align: /minor$/i.test(k) ? 'right' : 'left',
    render: (row) => {
      const v = row[k];
      if (/minor$/i.test(k) && typeof v === 'number')
        return <Price minor={v} currency={currency} emphasize={false} />;
      if (v == null) return <span className="text-bone-500">—</span>;
      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
      return <span className="text-bone-200">{String(v)}</span>;
    },
  }));

  if (lines.length === 0 && totals.length === 0) return <RecordView record={result} />;

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 ? (
        <DataTable
          columns={columns}
          rows={lines}
          rowKey={(row, i) => (typeof row.id === 'string' ? row.id : String(i))}
          minWidth={360}
        />
      ) : null}
      {totals.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {totals.map(([key, value]) => {
            const emphatic = /(grand|net|total)/i.test(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 border-t border-white/10 pt-2"
              >
                <span className="text-sm text-bone-400">
                  {humanize(key.replace(/Minor$/i, ''))}
                </span>
                <Price minor={value} currency={currency} emphasize={emphatic} />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Payments (E8b) ------------------------------ */

const PAYMENT_METHODS: SelectOption[] = [
  { value: '', label: 'Any method' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'cash', label: 'Cash / in-person' },
];

function PaymentsTab({ token }: { token: string }) {
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [marketCode, setMarketCode] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const amountMinor = amount ? parseMoneyToMinor(amount) : null;
      const body: Record<string, unknown> = {
        ...(method ? { method } : {}),
        ...(amountMinor != null ? { amountMinor, currency } : {}),
        ...(buyerCountry ? { buyerCountry: buyerCountry.toUpperCase() } : {}),
        ...(marketCode ? { marketCode } : {}),
      };
      setResult(await resolvePaymentRoute(body, token));
    } catch (err) {
      setError(friendlyError(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormTabShell
      title="Payment route"
      blurb="Resolve the payment route the engine would select. MANUAL_REVIEW_REQUIRED is flagged for an operator to action."
      onSubmit={submit}
      busy={busy}
      submitLabel="Resolve route"
      error={error}
      result={result ? <RecordView record={result} /> : null}
      fields={
        <>
          <Field label="Payment method">
            <Select
              options={PAYMENT_METHODS}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </Field>
          <Field label="Transaction amount" hint="Optional. Binding currency for this simulation.">
            <CurrencyAmountInput
              amount={amount}
              currency={currency}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
            />
          </Field>
          <Field label="Buyer country">
            <TextInput
              value={buyerCountry}
              onChange={(e) => setBuyerCountry(e.target.value)}
              placeholder="ISO-2, e.g. LK"
            />
          </Field>
          <Field label="Market code">
            <TextInput
              value={marketCode}
              onChange={(e) => setMarketCode(e.target.value)}
              placeholder="e.g. LK-CORE"
            />
          </Field>
        </>
      }
    />
  );
}

/* ------------------------------ Risk (E12) ------------------------------ */

const BAND_TONE: Record<RiskAssessment['band'], ChipTone> = {
  low: 'win',
  medium: 'gold',
  high: 'outbid',
};

function RiskTab({ token }: { token: string }) {
  const [accountAgeDays, setAccountAgeDays] = useState('30');
  const [rapidActions, setRapidActions] = useState('0');
  const [unverifiedHighValue, setUnverifiedHighValue] = useState(false);
  const [mismatchedCountry, setMismatchedCountry] = useState(false);
  const [chargebackHistory, setChargebackHistory] = useState(false);
  const [result, setResult] = useState<RiskAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await insightRisk(
        {
          accountAgeDays: Number(accountAgeDays) || 0,
          rapidActions: Number(rapidActions) || 0,
          unverifiedHighValue,
          mismatchedCountry,
          chargebackHistory,
        },
        token,
      );
      setResult(res);
    } catch (err) {
      setError(friendlyError(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormTabShell
      title="Risk signal"
      blurb="Score a set of account signals. Deterministic and advisory only."
      note="A review signal, never an automatic block."
      onSubmit={submit}
      busy={busy}
      submitLabel="Assess risk"
      error={error}
      result={result ? <RiskResult r={result} /> : null}
      fields={
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account age (days)">
              <TextInput
                inputMode="numeric"
                value={accountAgeDays}
                onChange={(e) => setAccountAgeDays(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field label="Rapid actions (1h)">
              <TextInput
                inputMode="numeric"
                value={rapidActions}
                onChange={(e) => setRapidActions(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          <Checkbox
            label="Unverified high-value activity"
            checked={unverifiedHighValue}
            onChange={setUnverifiedHighValue}
          />
          <Checkbox
            label="Country mismatch (IP vs profile)"
            checked={mismatchedCountry}
            onChange={setMismatchedCountry}
          />
          <Checkbox
            label="Chargeback history"
            checked={chargebackHistory}
            onChange={setChargebackHistory}
          />
        </>
      }
    />
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-bone-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-gold-500"
      />
      <span>{label}</span>
    </label>
  );
}

function RiskResult({ r }: { r: RiskAssessment }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone={BAND_TONE[r.band]}>{r.band} risk</Chip>
        <span className="text-sm text-bone-400">Score</span>
        <span className="tabular font-display text-2xl font-bold text-bone">{r.score}</span>
      </div>
      <div>
        <p className="eyebrow text-bone-500">Flags</p>
        {r.flags.length === 0 ? (
          <p className="mt-2 text-sm text-bone-500">No risk flags raised.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.flags.map((f, i) => (
              <Chip key={i} tone="outbid">
                {humanize(f)}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-bone-500">
        Advisory only (binding: false). A review signal, never an automatic block — an operator
        decides.
      </p>
    </div>
  );
}

/* ------------------------------ KYC (E11 · Singha ID) ------------------------------ */

const KYC_CAPS: SelectOption[] = [
  { value: 'originate_listings', label: 'Originate listings' },
  { value: 'take_offers', label: 'Take offers' },
  { value: 'run_auctions', label: 'Run auctions' },
  { value: 'accept_payments', label: 'Accept payments' },
  { value: 'high_value_bidding', label: 'High-value bidding' },
];

const KYC_DECISIONS: SelectOption[] = [
  { value: 'verified', label: 'Verify (approve)' },
  { value: 'rejected', label: 'Reject' },
];

function KycTab({ token }: { token: string }) {
  const [customerId, setCustomerId] = useState('');
  const [capability, setCapability] = useState('originate_listings');
  const [decision, setDecision] = useState<'verified' | 'rejected'>('verified');
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState<{
    customerId: string;
    capability: string;
    status: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!customerId.trim()) {
      setError('Enter the member customer ID to decide.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await decideCapability(
        {
          customerId: customerId.trim(),
          capability,
          decision,
          ...(decision === 'verified' && expiresAt
            ? { expiresAt: new Date(expiresAt).toISOString() }
            : {}),
        },
        token,
      );
      setResult(res);
    } catch (err) {
      setError(friendlyError(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormTabShell
      title="Member verification (KYC)"
      blurb="Decide a member's pending capability. Verifying grants it (optionally until an expiry); rejecting denies it."
      note="You are the reviewer; the evidence bar is owner-defined (O7)."
      onSubmit={submit}
      busy={busy}
      submitLabel={decision === 'verified' ? 'Verify capability' : 'Reject capability'}
      error={error}
      fields={
        <>
          <Field label="Member customer ID" required>
            <TextInput
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="cust_…"
            />
          </Field>
          <Field label="Capability">
            <Select
              options={KYC_CAPS}
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
            />
          </Field>
          <Field label="Decision">
            <Select
              options={KYC_DECISIONS}
              value={decision}
              onChange={(e) => setDecision(e.target.value as 'verified' | 'rejected')}
            />
          </Field>
          {decision === 'verified' ? (
            <Field label="Expires at" hint="Optional. Leave blank for no expiry.">
              <TextInput
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          ) : null}
        </>
      }
      result={
        result ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-bone-400">Member</span>
              <span className="tabular text-sm text-bone-200">{result.customerId}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-bone-400">Capability</span>
              <Chip>{humanize(result.capability)}</Chip>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-bone-400">Status</span>
              <StatusChip status={result.status} />
            </div>
          </div>
        ) : null
      }
    />
  );
}
