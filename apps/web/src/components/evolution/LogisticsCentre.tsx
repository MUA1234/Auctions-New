'use client';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  DataTable,
  EmptyState,
  Field,
  Select,
  Skeleton,
  Tabs,
  TextInput,
  type Column,
  type SelectOption,
  type TabItem,
} from '@singha/ui';
import {
  bookLogisticsQuote,
  fetchIncoterms,
  fetchLogisticsNodes,
  fetchShipment,
  requestLogisticsQuote,
  type Incoterm,
  type LogisticsNode,
  type LogisticsQuote,
  type Shipment,
} from '../../lib/evolution-api';
import { useAuth } from '../../lib/auth';
import { formatDateTime, humanize, incotermName } from '../../lib/format';
import { SignInPrompt } from '../../components/SignInPrompt';
import { StatusChip } from '../../components/StatusChip';
import { Price } from './Price';
import { friendlyMessage } from './evo-api-error';

/**
 * Singha Logistics (E7). One flag-gated buyer surface with three tabs:
 *  - Reference — the PUBLIC Incoterms + ports/hubs catalogue (no token). Also feeds the Quote form.
 *  - Quote — an indicative freight quote (requires a token); "a quote is not a booking" until the
 *    buyer confirms, at which point a shipment is created and handed to the Track tab.
 *  - Track — a read-only, append-only shipment event timeline (requires a token).
 * Singha's engine is authoritative; freight figures are indicative and never binding (rule 12/AI-3).
 */

type TabKey = 'reference' | 'quote' | 'track';

const TABS: TabItem[] = [
  { key: 'reference', label: 'Reference' },
  { key: 'quote', label: 'Quote' },
  { key: 'track', label: 'Track' },
];

const MODES: SelectOption[] = [
  { value: 'SEA_FCL', label: 'Sea freight — FCL (full container)' },
  { value: 'SEA_LCL', label: 'Sea freight — LCL (consolidated)' },
  { value: 'AIR', label: 'Air freight' },
  { value: 'ROAD', label: 'Road haulage' },
];

/** Plain-English freight-mode label (CX8) — reuses the same wording the Quote form's own
 *  `MODES` select already shows, instead of `humanize()` on the raw enum (which renders
 *  `SEA_FCL` as shouting "SEA FCL"). Falls back to `humanize()` for any mode not in the list
 *  so an unrecognised value never disappears, it just loses the parenthetical explainer. */
const MODE_LABELS = new Map(MODES.map((m) => [m.value, m.label]));
function modeLabel(mode: string | undefined): string {
  if (!mode) return '—';
  return MODE_LABELS.get(mode) ?? humanize(mode);
}

const SIGN_IN_NEXT = '/services/logistics';

function errMsg(e: unknown, fallback: string): string {
  return friendlyMessage(e, fallback);
}

export function LogisticsCentre() {
  const [tab, setTab] = useState<TabKey>('reference');
  const [trackSeed, setTrackSeed] = useState('');

  // Public Incoterms + ports/hubs reference (no token). Shared with the Quote form's selects.
  const [incoterms, setIncoterms] = useState<Incoterm[] | null>(null);
  const [nodes, setNodes] = useState<LogisticsNode[] | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setRefError(null);
    setIncoterms(null);
    setNodes(null);
    Promise.all([fetchIncoterms(), fetchLogisticsNodes()])
      .then(([inc, nds]) => {
        if (!alive) return;
        setIncoterms(inc);
        setNodes(nds);
      })
      .catch((e) => {
        if (alive) setRefError(errMsg(e, 'Could not load the logistics reference.'));
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const goToTrack = useCallback((shipmentId: string) => {
    setTrackSeed(shipmentId);
    setTab('track');
  }, []);

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow text-gold-300">Singha Logistics</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-bone sm:text-4xl">
          Incoterms, freight &amp; shipment tracking
        </h1>
        <p className="mt-3 leading-relaxed text-bone-400">
          The trade terms and ports behind a cross-border deal, an indicative freight quote, and
          append-only tracking once a shipment is moving. A quote is indicative and never a booking
          until you confirm it.
        </p>
      </header>

      <Tabs className="mt-8" tabs={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} />

      <div className="mt-8">
        {tab === 'reference' ? (
          <ReferencePanel
            incoterms={incoterms}
            nodes={nodes}
            error={refError}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        ) : null}
        {tab === 'quote' ? (
          <QuotePanel incoterms={incoterms ?? []} nodes={nodes ?? []} onTrack={goToTrack} />
        ) : null}
        {tab === 'track' ? <TrackPanel seedId={trackSeed} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------ Reference (public) ------------------------------ */

function ReferencePanel({
  incoterms,
  nodes,
  error,
  onRetry,
}: {
  incoterms: Incoterm[] | null;
  nodes: LogisticsNode[] | null;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Card className="text-center">
        <p className="text-outbid">{error}</p>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  if (incoterms == null || nodes == null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-7 w-40" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  const incotermCols: Column<Incoterm>[] = [
    {
      key: 'code',
      header: 'Term',
      render: (r) => <span className="font-mono font-semibold text-bone">{r.code}</span>,
    },
    {
      // Plain-English name (CX8): falls back to the standard ICC name for a recognised code
      // when the API doesn't send one, instead of a bare "—" next to a term the buyer may not
      // know by its abbreviation alone.
      key: 'name',
      header: 'Name',
      render: (r) => r.name ?? incotermName(r.code) ?? '—',
    },
    {
      key: 'arranger',
      header: 'Freight arranged by',
      render: (r) => (r.freightArranger ? humanize(r.freightArranger) : '—'),
    },
    {
      key: 'desc',
      header: 'What it means',
      render: (r) => <span className="text-bone-400">{r.description ?? '—'}</span>,
    },
  ];

  const nodeCols: Column<LogisticsNode>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (r) => <span className="font-mono text-bone">{r.code ?? '—'}</span>,
    },
    { key: 'name', header: 'Port / hub', render: (r) => r.name ?? '—' },
    {
      key: 'kind',
      header: 'Kind',
      render: (r) => (r.kind ? <Chip>{humanize(r.kind)}</Chip> : '—'),
    },
    { key: 'country', header: 'Country', render: (r) => r.country ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-serif text-xl text-bone">Incoterms</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-bone-500">
          The trade term fixes who arranges and pays for main freight, and where risk passes from
          seller to buyer. Reference only — the binding term is the one stated on your deal.
        </p>
        <Card className="mt-4 p-2 sm:p-3">
          <DataTable
            columns={incotermCols}
            rows={incoterms}
            rowKey={(r) => r.code}
            minWidth={640}
            empty="No Incoterms published yet."
          />
        </Card>
      </section>

      <section>
        <h2 className="font-serif text-xl text-bone">Ports &amp; hubs</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-bone-500">
          Sea ports, airports and inland hubs Singha can route freight through.
        </p>
        <Card className="mt-4 p-2 sm:p-3">
          <DataTable
            columns={nodeCols}
            rows={nodes}
            rowKey={(r, i) => r.id ?? r.code ?? String(i)}
            minWidth={560}
            empty="No ports or hubs published yet."
          />
        </Card>
      </section>
    </div>
  );
}

/* ------------------------------ Quote (authed) ------------------------------ */

function QuotePanel({
  incoterms,
  nodes,
  onTrack,
}: {
  incoterms: Incoterm[];
  nodes: LogisticsNode[];
  onTrack: (shipmentId: string) => void;
}) {
  const { token, loading: authLoading } = useAuth();

  const [incoterm, setIncoterm] = useState('');
  const [mode, setMode] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [units, setUnits] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const [quote, setQuote] = useState<LogisticsQuote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incotermOptions = useMemo<SelectOption[]>(
    () =>
      incoterms.map((i) => ({ value: i.code, label: i.name ? `${i.code} — ${i.name}` : i.code })),
    [incoterms],
  );
  const nodeOptions = useMemo<SelectOption[]>(
    () =>
      nodes.map((n, idx) => {
        const value = n.code ?? n.id ?? String(idx);
        const label = [n.code, n.name].filter(Boolean).join(' — ') || value;
        return { value, label };
      }),
    [nodes],
  );

  if (authLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!token)
    return (
      <SignInPrompt
        title="Sign in for a freight quote"
        description="Freight quotes and bookings are tied to your Singha account. The Incoterms and ports reference stays open on the Reference tab."
        next={SIGN_IN_NEXT}
      />
    );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    if (!incoterm || !mode) {
      setError('Choose an Incoterm and a freight mode to get a quote.');
      return;
    }
    const body: Record<string, unknown> = { incoterm, mode };
    if (origin) body.originNodeCode = origin;
    if (destination) body.destinationNodeCode = destination;
    const unitsNum = Number(units);
    if (units && Number.isFinite(unitsNum) && unitsNum > 0) body.units = unitsNum;
    const weightNum = Number(weightKg);
    if (weightKg && Number.isFinite(weightNum) && weightNum > 0) body.weightKg = weightNum;

    setSubmitting(true);
    try {
      const q = await requestLogisticsQuote(body, token);
      setQuote(q);
    } catch (err) {
      setError(errMsg(err, 'Could not produce a quote right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Incoterm" required>
            <Select
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value)}
              options={incotermOptions}
              placeholder="Select a trade term"
            />
          </Field>
          <Field label="Freight mode" required>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              options={MODES}
              placeholder="Select a mode"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Origin">
              <Select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                options={nodeOptions}
                placeholder="Origin port / hub"
              />
            </Field>
            <Field label="Destination">
              <Select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                options={nodeOptions}
                placeholder="Destination port / hub"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Units" hint="Containers, packages or lots.">
              <TextInput
                type="number"
                min="0"
                inputMode="numeric"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g. 1"
              />
            </Field>
            <Field label="Weight (kg)">
              <TextInput
                type="number"
                min="0"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="e.g. 12000"
              />
            </Field>
          </div>
          {error ? (
            <p className="text-sm text-outbid" role="alert">
              {error}
            </p>
          ) : null}
          <div>
            <Button type="submit" variant="gold" disabled={submitting}>
              {submitting ? 'Getting quote…' : 'Get freight quote'}
            </Button>
          </div>
        </form>
      </Card>

      <div>
        {quote ? (
          <QuoteResult quote={quote} token={token} onTrack={onTrack} />
        ) : (
          <EmptyState
            title="Your quote will appear here"
            description="Pick a trade term and mode, add the route and load, and Singha returns an indicative freight figure. A quote is not a booking."
          />
        )}
      </div>
    </div>
  );
}

function QuoteResult({
  quote,
  token,
  onTrack,
}: {
  quote: LogisticsQuote;
  token: string;
  onTrack: (shipmentId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  async function book() {
    setError(null);
    setBooking(true);
    try {
      const res = await bookLogisticsQuote(quote.id, token);
      const s = res.shipment ?? null;
      setShipment(s);
      setConfirming(false);
      if (!s) setError('Booking recorded, but no shipment was returned to track.');
    } catch (err) {
      setError(errMsg(err, 'Could not book this quote.'));
    } finally {
      setBooking(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-gold-300">Indicative quote</p>
        {quote.mode ? <Chip>{modeLabel(quote.mode)}</Chip> : null}
      </div>

      <Price
        minor={quote.freightMinor ?? null}
        currency={quote.currency ?? 'LKR'}
        className="text-3xl"
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-bone-500">Incoterm</dt>
          <dd className="mt-0.5 text-bone">
            <span className="font-mono">{quote.incoterm ?? '—'}</span>
            {quote.incoterm && incotermName(quote.incoterm) && (
              <span className="ml-1.5 text-xs text-bone-400">{incotermName(quote.incoterm)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-bone-500">Freight paid by</dt>
          <dd className="mt-0.5 text-bone-200">
            {quote.freightResponsibility ? humanize(quote.freightResponsibility) : '—'}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-bone-500">Quote valid until</dt>
          <dd className="mt-0.5 text-bone-200">{formatDateTime(quote.expiresAt)}</dd>
        </div>
      </dl>

      <p className="rounded-lg border border-gold-500/20 bg-gold-500/[0.06] px-3 py-2 text-xs leading-relaxed text-gold-200">
        A quote is not a booking. Freight figures are indicative until you confirm and a carrier
        accepts the shipment.
      </p>

      {shipment ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.08] p-3">
          <p className="text-sm font-semibold text-red-300">Booked — shipment created.</p>
          <p className="mt-1 text-xs text-bone-400">
            Your tracking reference — keep it to check status on the Track tab later.
          </p>
          <p className="mt-1 break-all font-mono text-sm text-bone">{shipment.id}</p>
          <Button variant="outline" className="mt-3" onClick={() => onTrack(shipment.id)}>
            Track this shipment →
          </Button>
        </div>
      ) : confirming ? (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm text-bone-200">Book this quote and create a shipment?</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" disabled={booking} onClick={book}>
              {booking ? 'Booking…' : 'Confirm booking'}
            </Button>
            <Button variant="ghost" disabled={booking} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="primary" onClick={() => setConfirming(true)}>
            Book this quote
          </Button>
        </div>
      )}

      {error ? (
        <p className="text-sm text-outbid" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

/* ------------------------------ Track (authed, read-only) ------------------------------ */

function TrackPanel({ seedId }: { seedId: string }) {
  const { token, loading: authLoading } = useAuth();
  const [input, setInput] = useState(seedId);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string, tok: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setShipment(null);
    try {
      const s = await fetchShipment(trimmed, tok);
      setShipment(s);
    } catch (err) {
      setError(errMsg(err, 'Could not find that shipment.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load a shipment handed over from a fresh booking.
  useEffect(() => {
    if (seedId && token) {
      setInput(seedId);
      void load(seedId, token);
    }
  }, [seedId, token, load]);

  if (authLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (!token)
    return (
      <SignInPrompt
        title="Sign in to track a shipment"
        description="Shipment tracking is tied to your Singha account. The Incoterms and ports reference stays open on the Reference tab."
        next={SIGN_IN_NEXT}
      />
    );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (token) void load(input, token);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Tracking reference" className="flex-1">
            <TextInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste the reference from your booking confirmation"
            />
          </Field>
          <Button type="submit" variant="primary" disabled={loading || !input.trim()}>
            {loading ? 'Looking up…' : 'Track shipment'}
          </Button>
        </form>
      </Card>

      {error ? (
        <Card className="text-center">
          <p className="text-outbid">{error}</p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                if (token) void load(input, token);
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : shipment ? (
        <ShipmentTimeline shipment={shipment} />
      ) : (
        <EmptyState
          title="Track a shipment"
          description="Enter the tracking reference from your booking confirmation to see its current status and the append-only event history. Buyers view tracking read-only."
        />
      )}
    </div>
  );
}

function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const events = shipment.events ?? [];
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-bone-500">Tracking reference</p>
          <p className="mt-0.5 break-all font-mono text-sm text-bone">{shipment.id}</p>
        </div>
        {shipment.status ? <StatusChip status={shipment.status} /> : null}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-bone-500">
          No tracking events yet. Milestones appear here as the carrier reports them.
        </p>
      ) : (
        <ol className="flex flex-col">
          {events.map((ev, i) => (
            <li key={i} className="flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-coal-900 bg-gold-400"
                />
                {i < events.length - 1 ? (
                  <span aria-hidden className="w-px flex-1 bg-white/10" />
                ) : null}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {ev.status ? (
                    <StatusChip status={ev.status} />
                  ) : (
                    <span className="text-sm text-bone-200">Update</span>
                  )}
                  <span className="text-xs text-bone-500">{formatDateTime(ev.at)}</span>
                </div>
                {ev.note ? <p className="mt-1 text-sm text-bone-300">{ev.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-bone-500">
        This history is append-only. Buyers view tracking read-only.
      </p>
    </Card>
  );
}
