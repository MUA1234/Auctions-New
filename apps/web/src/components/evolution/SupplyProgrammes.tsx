'use client';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, Card, Field, Select, Skeleton, TextInput, cn } from '@singha/ui';
import { CurrencyAmountInput } from './CurrencyAmountInput';
import { QuantityUnitInput } from './QuantityUnitInput';
import { FormSection } from './FormSection';
import { Price } from './Price';
import { friendlyMessage } from './evo-api-error';
import { StatusChip } from '../../components/StatusChip';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import { useFlags } from '../../lib/use-flags';
import {
  formatDate,
  formatQuantity,
  humanize,
  INCOTERM_OPTIONS,
  parseMoneyToMinor,
  toApiDateTime,
} from '../../lib/format';
import {
  attachPerishable,
  createSupplyProgramme,
  fetchMySupplyProgrammes,
  fetchPerishable,
  fetchSupplyProgramme,
  setSupplyProgrammeStatus,
  type PerishableSummary,
  type SupplyProgrammeDetail,
  type SupplyProgrammeSummary,
} from '../../lib/evolution-api';

/**
 * Supply programmes (E10 · seller, CX6 pack docs 04/05). A supplier publishes a recurring
 * commercial PROGRAMME — not a one-off technical record — described by its cadence (how often),
 * volume (how much per order) and term (how long the arrangement runs), plus indicative pricing
 * and lead time; buyers are matched to ACTIVE programmes. Includes status transitions
 * (activate/pause/withdraw) and, when the `perishableGoods` capability is on, an inline panel to
 * attach perishable metadata (harvest/expiry, cold-chain, temperature band, shipment window) as a
 * derived record on the programme, plus a plain-English shelf-life/cold-chain summary once saved.
 */

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'on_demand', label: 'On demand' },
];
const PRICING_OPTIONS = [
  { value: 'total_lot', label: 'Total lot' },
  { value: 'per_unit', label: 'Per unit' },
];

type Transition = { label: string; to: string; variant: 'primary' | 'dark' | 'outline' };
function transitionsFor(status: string): Transition[] {
  switch (status.toLowerCase()) {
    case 'draft':
      return [{ label: 'Activate', to: 'active', variant: 'primary' }];
    case 'active':
      return [
        { label: 'Pause', to: 'paused', variant: 'dark' },
        { label: 'Withdraw', to: 'withdrawn', variant: 'outline' },
      ];
    case 'paused':
      return [
        { label: 'Activate', to: 'active', variant: 'primary' },
        { label: 'Withdraw', to: 'withdrawn', variant: 'outline' },
      ];
    default:
      return [];
  }
}

export function SupplyProgrammes() {
  const { token, loading } = useAuth();
  const { flags } = useFlags();

  const [product, setProduct] = useState('');
  const [category, setCategory] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxOrder, setMaxOrder] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [pricingBasis, setPricingBasis] = useState('per_unit');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [incoterm, setIncoterm] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const [rows, setRows] = useState<SupplyProgrammeSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setRows(null);
      return;
    }
    let alive = true;
    setRows(null);
    setListError(null);
    fetchMySupplyProgrammes(token)
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e: unknown) => {
        if (alive) {
          setRows([]);
          setListError(friendlyMessage(e, 'Could not load your programmes.'));
        }
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function refresh(t: string) {
    try {
      setRows(await fetchMySupplyProgrammes(t));
    } catch {
      /* keep the existing list on a refresh failure */
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setCreated(null);
    if (!product.trim()) {
      setError('Name the product you supply.');
      return;
    }
    setSubmitting(true);
    try {
      const q = quantity.trim();
      const priceMinor = parseMoneyToMinor(price);
      const lead = leadTimeDays.trim() ? Number(leadTimeDays.trim()) : undefined;
      const body: Record<string, unknown> = {
        product: product.trim(),
        category: category.trim() || undefined,
        originCountry: originCountry.trim() || undefined,
        availableQuantity: q || undefined,
        quantityUnitCode: q && unit ? unit : undefined,
        minOrderQuantity: minOrder.trim() || undefined,
        maxOrderQuantity: maxOrder.trim() || undefined,
        frequency,
        pricingBasis,
        indicativePriceMinor: priceMinor ?? undefined,
        currency,
        incoterm: incoterm.trim() || undefined,
        leadTimeDays: lead != null && Number.isFinite(lead) ? lead : undefined,
        validFrom: toApiDateTime(validFrom),
        validUntil: toApiDateTime(validUntil),
      };
      const res = await createSupplyProgramme(body, token);
      const cadence =
        FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? humanize(frequency);
      const term = validFrom ? ` from ${formatDate(toApiDateTime(validFrom))}` : '';
      setCreated(`${res.product || product.trim()} — ${cadence.toLowerCase()}${term}`);
      setProduct('');
      setCategory('');
      setQuantity('');
      setPrice('');
      setMinOrder('');
      setMaxOrder('');
      setIncoterm('');
      setLeadTimeDays('');
      setValidFrom('');
      setValidUntil('');
      await refresh(token);
    } catch (err: unknown) {
      setError(friendlyMessage(err, 'Could not create the programme. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function transition(id: string, to: string) {
    if (!token) return;
    setBusy(id);
    try {
      const res = await setSupplyProgrammeStatus(id, to, token);
      setRows((prev) =>
        prev ? prev.map((p) => (p.id === id ? { ...p, status: res.status } : p)) : prev,
      );
    } catch {
      /* leave the status unchanged on failure */
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="container-page py-10 sm:py-14">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container-page py-10 sm:py-14">
        <SignInPrompt
          title="Sign in to list a supply programme"
          description="Publish what you can supply — recurring or on demand — and let buyers searching the market match to you."
          next="/sell/supply"
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow text-gold-300">Supply programmes</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-bone sm:text-4xl">
          Turn recurring supply into a commercial programme.
        </h1>
        <p className="mt-3 text-bone-400">
          Not a one-off listing — a standing arrangement with its own cadence (how often you can
          supply), volume (order sizes) and term (how long it runs), plus indicative pricing and
          lead time. Buyers searching the market are matched to your active programmes.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-bone">New programme</h2>
          <form className="mt-5 space-y-7" onSubmit={submit}>
            <FormSection title="What you supply">
              <Field label="Product" htmlFor="sp-product" required>
                <TextInput
                  id="sp-product"
                  aria-label="Product"
                  placeholder="e.g. Ceylon black tea, BOPF"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="sp-category">
                  <TextInput
                    id="sp-category"
                    placeholder="e.g. Beverages"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </Field>
                <Field label="Origin country" htmlFor="sp-origin">
                  <TextInput
                    id="sp-origin"
                    placeholder="e.g. Sri Lanka"
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Cadence & volume"
              hint="How often you can supply, and how much per order."
            >
              <Field label="Available quantity" htmlFor="sp-qty">
                <QuantityUnitInput
                  id="sp-qty"
                  quantity={quantity}
                  unit={unit}
                  onQuantityChange={setQuantity}
                  onUnitChange={setUnit}
                />
              </Field>
              <Field label="How often can you supply?" htmlFor="sp-freq">
                <Select
                  id="sp-freq"
                  options={FREQUENCY_OPTIONS}
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Min order qty" htmlFor="sp-min">
                  <TextInput
                    id="sp-min"
                    inputMode="decimal"
                    placeholder="0"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value.replace(/[^\d.]/g, ''))}
                  />
                </Field>
                <Field label="Max order qty" htmlFor="sp-max">
                  <TextInput
                    id="sp-max"
                    inputMode="decimal"
                    placeholder="0"
                    value={maxOrder}
                    onChange={(e) => setMaxOrder(e.target.value.replace(/[^\d.]/g, ''))}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Pricing">
              <Field label="Pricing basis" htmlFor="sp-basis">
                <Select
                  id="sp-basis"
                  options={PRICING_OPTIONS}
                  value={pricingBasis}
                  onChange={(e) => setPricingBasis(e.target.value)}
                />
              </Field>
              <Field
                label="Indicative price"
                htmlFor="sp-price"
                hint="Non-binding — a guide for matching."
              >
                <CurrencyAmountInput
                  id="sp-price"
                  amount={price}
                  currency={currency}
                  onAmountChange={setPrice}
                  onCurrencyChange={setCurrency}
                />
              </Field>
            </FormSection>

            <FormSection title="Commercial terms">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Incoterm" htmlFor="sp-incoterm">
                  <Select
                    id="sp-incoterm"
                    options={INCOTERM_OPTIONS}
                    placeholder="Select incoterm"
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value)}
                  />
                </Field>
                <Field label="Lead time (days)" htmlFor="sp-lead">
                  <TextInput
                    id="sp-lead"
                    inputMode="numeric"
                    placeholder="0"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Programme term" hint="How long this standing arrangement runs for.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valid from" htmlFor="sp-from">
                  <TextInput
                    id="sp-from"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </Field>
                <Field label="Valid until" htmlFor="sp-until">
                  <TextInput
                    id="sp-until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            {error ? <p className="text-sm text-outbid">{error}</p> : null}
            {created ? (
              <p className="text-sm text-red-300">
                Created “{created}”. Set it active to start matching.
              </p>
            ) : null}

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create programme'}
            </Button>
          </form>
        </Card>

        <div>
          <h2 className="font-display text-lg font-semibold text-bone">My programmes</h2>
          <p className="mt-1 text-sm text-bone-500">
            Activate, pause or withdraw — and add perishable details where relevant.
          </p>
          <div className="mt-4 space-y-3">
            {rows === null ? (
              <>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </>
            ) : listError && rows.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-outbid">{listError}</p>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => void refresh(token)}>
                    Retry
                  </Button>
                </div>
              </Card>
            ) : rows.length === 0 ? (
              <Card className="py-10 text-center">
                <p className="text-sm text-bone-500">
                  No programmes yet. Create your first one on the left.
                </p>
              </Card>
            ) : (
              rows.map((p) => {
                const moves = transitionsFor(p.status);
                return (
                  <Card key={p.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-bone">
                          {p.product}
                        </h3>
                        {p.category ? <p className="text-xs text-bone-500">{p.category}</p> : null}
                      </div>
                      <StatusChip status={p.status} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {moves.map((m) => (
                        <Button
                          key={m.to}
                          variant={m.variant}
                          disabled={busy === p.id}
                          onClick={() => void transition(p.id, m.to)}
                        >
                          {m.label}
                        </Button>
                      ))}
                      {moves.length === 0 ? (
                        <span className="text-xs text-bone-600">No further actions.</span>
                      ) : null}
                    </div>
                    <ProgrammeTermsPanel
                      programmeId={p.id}
                      token={token}
                      showPerishable={Boolean(flags.perishableGoods)}
                    />
                    {flags.perishableGoods ? (
                      <PerishablePanel programmeId={p.id} token={token} />
                    ) : null}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function orderSizeLabel(d: SupplyProgrammeDetail): string {
  const { minOrderQuantity: min, maxOrderQuantity: max, quantityUnitCode: unit } = d;
  if (!min && !max) return '—';
  if (min && max) return `${formatQuantity(min)} – ${formatQuantity(max, unit ?? undefined)}`;
  if (min) return `Min ${formatQuantity(min, unit ?? undefined)}`;
  return `Max ${formatQuantity(max, unit ?? undefined)}`;
}

/**
 * Read-only "programme terms" disclosure (CX6 doc 04/05: cadence / volume / term as a commercial
 * programme, not a technical record). Lazily fetches the richer single-programme read
 * (`GET /supply/programmes/:id`, wired up by this change — it already existed on the backend but
 * the frontend never called it) plus, when relevant, the perishable summary
 * (`GET /supply/perishable/supply_programme/:id`, also newly wired up). Both fetch only when the
 * seller opens the panel, so the default card stays uncluttered.
 */
function ProgrammeTermsPanel({
  programmeId,
  token,
  showPerishable,
}: {
  programmeId: string;
  token: string;
  showPerishable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const [detail, setDetail] = useState<SupplyProgrammeDetail | null>(null);
  const [perishable, setPerishable] = useState<PerishableSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoadState('loading');
    setErr(null);
    try {
      setDetail(await fetchSupplyProgramme(programmeId, token));
    } catch (e: unknown) {
      setErr(friendlyMessage(e, 'Could not load the full programme terms.'));
    }
    if (showPerishable) {
      try {
        setPerishable(await fetchPerishable('supply_programme', programmeId, token));
      } catch {
        setPerishable(null); // nothing attached yet — not an error the seller needs to see here
      }
    }
    setLoadState('loaded');
  }

  function toggle() {
    if (!open && loadState === 'idle') void load();
    setOpen((o) => !o);
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="text-sm font-medium text-bone-300 hover:text-bone"
      >
        {open ? 'Hide programme terms' : 'View programme terms — cadence, volume & pricing'}
      </button>
      {open ? (
        loadState === 'loading' ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : err ? (
          <p className="mt-2 text-sm text-outbid">{err}</p>
        ) : detail ? (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-bone-500">Cadence</dt>
                <dd className="text-bone-200">{humanize(detail.frequency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-bone-500">Available</dt>
                <dd className="text-bone-200">
                  {formatQuantity(detail.availableQuantity, detail.quantityUnitCode ?? undefined)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bone-500">Order size</dt>
                <dd className="text-bone-200">{orderSizeLabel(detail)}</dd>
              </div>
              <div>
                <dt className="text-xs text-bone-500">Indicative price</dt>
                <dd className="text-bone-200">
                  <Price minor={detail.indicativePriceMinor} currency={detail.currency} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bone-500">Lead time</dt>
                <dd className="text-bone-200">
                  {detail.leadTimeDays != null ? `${detail.leadTimeDays} days` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bone-500">Origin</dt>
                <dd className="text-bone-200">{detail.originCountry ?? '—'}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-bone-600">
              The programme's validity window (term) is set when created but isn't shown back here
              yet — check your records for the dates you entered.
            </p>
          </>
        ) : null
      ) : null}
      {open && perishable ? (
        // Tint only, no border — already inside the programme's Card (CX10: avoid a
        // double-bordered nested card, doc 06 "fewer borders").
        <div
          className={cn(
            'mt-3 rounded-lg p-3 text-sm',
            perishable.expired ? 'bg-outbid/[0.08]' : 'bg-gold-500/[0.06]',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-300/80">
            Perishable
          </p>
          <p className="mt-1 text-bone-200">
            {[perishable.variety, perishable.grade].filter(Boolean).join(' · ') ||
              'Variety/grade not recorded'}
            {perishable.coldChain ? ' · Cold chain' : ''}
          </p>
          <p className="mt-0.5 text-bone-400">
            {perishable.expired
              ? 'Past its shelf life'
              : perishable.expiresAt
                ? `Shelf life: best before ${formatDate(perishable.expiresAt)}`
                : 'No shelf-life / expiry date recorded'}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Inline "attach perishable metadata" panel (E10). Only mounted when `perishableGoods` is on. */
function PerishablePanel({ programmeId, token }: { programmeId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [harvestDate, setHarvestDate] = useState('');
  const [packingDate, setPackingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [variety, setVariety] = useState('');
  const [grade, setGrade] = useState('');
  const [moisturePercent, setMoisturePercent] = useState('');
  const [coldChain, setColdChain] = useState(false);
  const [tempMinC, setTempMinC] = useState('');
  const [tempMaxC, setTempMaxC] = useState('');
  const [shipmentWindowStart, setShipmentWindowStart] = useState('');
  const [shipmentWindowEnd, setShipmentWindowEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const metadata: Record<string, unknown> = {
      harvestDate: toApiDateTime(harvestDate),
      packingDate: toApiDateTime(packingDate),
      expiryDate: toApiDateTime(expiryDate),
      variety: variety.trim() || undefined,
      grade: grade.trim() || undefined,
      moisturePercent: moisturePercent.trim() || undefined,
      coldChain: coldChain || undefined,
      tempMinC: tempMinC.trim() || undefined,
      tempMaxC: tempMaxC.trim() || undefined,
      shipmentWindowStart: toApiDateTime(shipmentWindowStart),
      shipmentWindowEnd: toApiDateTime(shipmentWindowEnd),
    };
    setSaving(true);
    try {
      await attachPerishable(
        { subjectType: 'supply_programme', subjectId: programmeId, metadata },
        token,
      );
      setMsg('Perishable metadata saved. Reopen “View programme terms” above to see the summary.');
    } catch (e2: unknown) {
      setErr(friendlyMessage(e2, 'Could not save perishable metadata.'));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-gold-300 hover:text-gold-200"
      >
        + Add perishable metadata — shelf life, temperature, harvest/expiry
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-bone-500">
        Perishable metadata
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Harvest date" htmlFor={`ph-harvest-${programmeId}`}>
          <TextInput
            id={`ph-harvest-${programmeId}`}
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
          />
        </Field>
        <Field label="Packing date" htmlFor={`ph-packing-${programmeId}`}>
          <TextInput
            id={`ph-packing-${programmeId}`}
            type="date"
            value={packingDate}
            onChange={(e) => setPackingDate(e.target.value)}
          />
        </Field>
        <Field label="Expiry date" htmlFor={`ph-expiry-${programmeId}`} hint="Shelf life end date.">
          <TextInput
            id={`ph-expiry-${programmeId}`}
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Variety" htmlFor={`ph-variety-${programmeId}`}>
          <TextInput
            id={`ph-variety-${programmeId}`}
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
          />
        </Field>
        <Field label="Grade" htmlFor={`ph-grade-${programmeId}`}>
          <TextInput
            id={`ph-grade-${programmeId}`}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </Field>
        <Field label="Moisture %" htmlFor={`ph-moisture-${programmeId}`}>
          <TextInput
            id={`ph-moisture-${programmeId}`}
            inputMode="decimal"
            value={moisturePercent}
            onChange={(e) => setMoisturePercent(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Temp min °C"
          htmlFor={`ph-tmin-${programmeId}`}
          hint="Temperature band (cold chain)."
        >
          <TextInput
            id={`ph-tmin-${programmeId}`}
            inputMode="decimal"
            value={tempMinC}
            onChange={(e) => setTempMinC(e.target.value)}
          />
        </Field>
        <Field label="Temp max °C" htmlFor={`ph-tmax-${programmeId}`}>
          <TextInput
            id={`ph-tmax-${programmeId}`}
            inputMode="decimal"
            value={tempMaxC}
            onChange={(e) => setTempMaxC(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-bone-300">
          <input
            type="checkbox"
            checked={coldChain}
            onChange={(e) => setColdChain(e.target.checked)}
          />
          Cold chain
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Shipment window start" htmlFor={`ph-ws-${programmeId}`}>
          <TextInput
            id={`ph-ws-${programmeId}`}
            type="date"
            value={shipmentWindowStart}
            onChange={(e) => setShipmentWindowStart(e.target.value)}
          />
        </Field>
        <Field label="Shipment window end" htmlFor={`ph-we-${programmeId}`}>
          <TextInput
            id={`ph-we-${programmeId}`}
            type="date"
            value={shipmentWindowEnd}
            onChange={(e) => setShipmentWindowEnd(e.target.value)}
          />
        </Field>
      </div>
      {err ? <p className="text-sm text-outbid">{err}</p> : null}
      {msg ? <p className="text-sm text-red-300">{msg}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="gold" disabled={saving}>
          {saving ? 'Saving…' : 'Save perishable metadata'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}
