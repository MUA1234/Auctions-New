'use client';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  DataTable,
  Field,
  Select,
  Skeleton,
  TextInput,
  Textarea,
  type Column,
} from '@singha/ui';
import { FormSection } from './FormSection';
import { QuantityUnitInput } from './QuantityUnitInput';
import { friendlyMessage } from './evo-api-error';
import { StatusChip } from '../../components/StatusChip';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import {
  CURRENCIES,
  formatDate,
  formatQuantity,
  procurementTypeLabel,
  toApiDateTime,
} from '../../lib/format';
import {
  createProcurementRequest,
  fetchMyProcurementRequests,
  type ProcurementRequest,
} from '../../lib/evolution-api';

/**
 * Procurement hub (E9 · pack doc 09, CX6 pack docs 04/05). The demand side of the exchange: a
 * buyer STATES A NEED — RFQ, request-supply or reverse-tender — and verified suppliers respond
 * with priced, comparable proposals. The creation form is grouped into short plain-English
 * sections (what / how much / spec & quality / where & when / budget) rather than one technical
 * field dump, and ends with a live plain-English summary so the buyer sees exactly what they're
 * about to post before they post it. This surface creates requests and lists the buyer's own;
 * comparison + award happen on the per-request detail. The auction/offer engine is authoritative
 * — the UI never settles a deal.
 */

/** Request type — value is the exact backend enum (`RFQ`/`REQUEST_SUPPLY`/`REVERSE_TENDER`);
 *  only the label is plain English. */
const TYPE_OPTIONS = [
  { value: 'RFQ', label: 'Get priced quotes from suppliers (RFQ)' },
  { value: 'REQUEST_SUPPLY', label: 'Request ongoing or recurring supply' },
  { value: 'REVERSE_TENDER', label: 'Run a reverse tender — suppliers compete on price' },
];
/** Short noun phrase per type, for the plain-English summary sentence ("You're posting…"). */
const TYPE_NOUN: Record<string, string> = {
  RFQ: 'a request for quote',
  REQUEST_SUPPLY: 'a recurring supply request',
  REVERSE_TENDER: 'a reverse tender',
};
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: c.code }));

export function ProcurementHub() {
  const { token, loading } = useAuth();

  const [type, setType] = useState('RFQ');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [specification, setSpecification] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [deliveryBy, setDeliveryBy] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [submissionCloseAt, setSubmissionCloseAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const [rows, setRows] = useState<ProcurementRequest[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setRows(null);
      return;
    }
    let alive = true;
    setRows(null);
    setListError(null);
    fetchMyProcurementRequests(token)
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e: unknown) => {
        if (alive) {
          setRows([]);
          setListError(friendlyMessage(e, 'Could not load your requests.'));
        }
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function refreshList(t: string) {
    try {
      setRows(await fetchMyProcurementRequests(t));
    } catch {
      /* keep the existing list on a refresh failure */
    }
  }

  /** Short plain-English restatement of the form, shown live above Submit (CX6 doc 04/05: "show a
   *  short plain-English summary before submit"). Only mentions parts the buyer has actually filled
   *  in, so it never reads like a form dump either. */
  const summaryLines = useMemo(() => {
    const lines: string[] = [];
    const noun = TYPE_NOUN[type] ?? 'a requirement';
    lines.push(
      title.trim()
        ? `You're posting ${noun} for “${title.trim()}”.`
        : `You're posting ${noun} — add a title so suppliers know what it's for.`,
    );
    if (quantity.trim()) lines.push(`Quantity: ${formatQuantity(quantity, unit || undefined)}.`);
    if (specification.trim()) lines.push(`Spec: ${specification.trim()}`);
    if (destinationCountry.trim()) lines.push(`Delivered to: ${destinationCountry.trim()}.`);
    if (deliveryBy) lines.push(`Needed by ${formatDate(toApiDateTime(deliveryBy))}.`);
    if (submissionCloseAt) {
      lines.push(`Suppliers can respond until ${formatDate(toApiDateTime(submissionCloseAt))}.`);
    }
    if (paymentTerms.trim()) lines.push(`Payment terms: ${paymentTerms.trim()}.`);
    lines.push(`Prices will be quoted in ${currency}.`);
    return lines;
  }, [
    type,
    title,
    quantity,
    unit,
    specification,
    destinationCountry,
    deliveryBy,
    submissionCloseAt,
    paymentTerms,
    currency,
  ]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setCreated(null);
    if (!title.trim()) {
      setError('Add a short title for your requirement.');
      return;
    }
    setSubmitting(true);
    try {
      const q = quantity.trim();
      const res = await createProcurementRequest(
        {
          type,
          title: title.trim(),
          category: category.trim() || undefined,
          specification: specification.trim() || undefined,
          quantity: q || undefined,
          quantityUnitCode: q && unit ? unit : undefined,
          destinationCountry: destinationCountry.trim() || undefined,
          deliveryBy: toApiDateTime(deliveryBy),
          currency,
          paymentTerms: paymentTerms.trim() || undefined,
          submissionCloseAt: toApiDateTime(submissionCloseAt),
        },
        token,
      );
      setCreated(res.title || 'Request posted.');
      setTitle('');
      setSpecification('');
      setQuantity('');
      setCategory('');
      setDestinationCountry('');
      setPaymentTerms('');
      setDeliveryBy('');
      setSubmissionCloseAt('');
      await refreshList(token);
    } catch (err: unknown) {
      setError(friendlyMessage(err, 'Could not post your request. Please try again.'));
    } finally {
      setSubmitting(false);
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
          title="Sign in to post a requirement"
          description="Post RFQs, request supply and run reverse tenders — verified suppliers respond with priced, comparable proposals."
          next="/wanted/procurement"
        />
      </div>
    );
  }

  const columns: Column<ProcurementRequest>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (r) => <span className="text-bone-300">{procurementTypeLabel(r.type)}</span>,
    },
    {
      key: 'title',
      header: 'Requirement',
      render: (r) => (
        <Link
          href={`/wanted/procurement/${r.id}`}
          className="font-medium text-bone hover:text-gold-300"
        >
          {r.title}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (r) => <StatusChip status={r.status} />,
    },
  ];

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow text-gold-300">Procurement</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-bone sm:text-4xl">
          Post what you need. Suppliers respond.
        </h1>
        <p className="mt-3 text-bone-400">
          Say what you're looking for in plain terms — Singha turns it into a structured request.
          Verified suppliers return priced, comparable proposals with delivery and payment terms —
          and you choose the winner.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-bone">New request</h2>
          <form className="mt-5 space-y-7" onSubmit={submit}>
            <FormSection title="What do you need" hint="A one-line summary suppliers see first.">
              <Field label="What kind of request is this?" htmlFor="pr-type" required>
                <Select
                  id="pr-type"
                  options={TYPE_OPTIONS}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
              </Field>
              <Field label="In one line, what do you need?" htmlFor="pr-title" required>
                <TextInput
                  id="pr-title"
                  placeholder="e.g. 200 MT red onion to Colombo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field
                label="Category"
                htmlFor="pr-category"
                hint="Helps route your request to the right suppliers."
              >
                <TextInput
                  id="pr-category"
                  placeholder="e.g. Agriculture · Produce"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Field>
            </FormSection>

            <FormSection title="Quantity" hint="How much do you need, and in what unit?">
              <Field label="Amount & unit" htmlFor="pr-qty">
                <QuantityUnitInput
                  id="pr-qty"
                  quantity={quantity}
                  unit={unit}
                  onQuantityChange={setQuantity}
                  onUnitChange={setUnit}
                />
              </Field>
            </FormSection>

            <FormSection title="Specification & quality">
              <Field
                label="Describe exactly what you need"
                htmlFor="pr-spec"
                hint="Grade, quality standard, packing, tolerances, certificates — anything a supplier needs to quote accurately."
              >
                <Textarea
                  id="pr-spec"
                  rows={3}
                  placeholder="e.g. Grade A, 40–60mm bulbs, jute bags, moisture max 12%"
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                />
              </Field>
            </FormSection>

            <FormSection title="Where & when">
              <Field label="Deliver to (country)" htmlFor="pr-dest">
                <TextInput
                  id="pr-dest"
                  placeholder="e.g. Sri Lanka"
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Needed by" htmlFor="pr-deliver" hint="Optional target delivery date.">
                  <TextInput
                    id="pr-deliver"
                    type="date"
                    value={deliveryBy}
                    onChange={(e) => setDeliveryBy(e.target.value)}
                  />
                </Field>
                <Field
                  label="Supplier responses due by"
                  htmlFor="pr-close"
                  hint="When the submission window closes."
                >
                  <TextInput
                    id="pr-close"
                    type="date"
                    value={submissionCloseAt}
                    onChange={(e) => setSubmissionCloseAt(e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Budget & payment terms">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency" htmlFor="pr-currency" required>
                  <Select
                    id="pr-currency"
                    options={CURRENCY_OPTIONS}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />
                </Field>
                <Field
                  label="Payment terms"
                  htmlFor="pr-terms"
                  hint="e.g. 30% advance, balance on delivery"
                >
                  <TextInput
                    id="pr-terms"
                    placeholder="e.g. 30% advance, balance on delivery"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            {/* Tint only, no border — this callout already sits inside the form's Card
                (CX10: avoid a double-bordered nested card, doc 06 "fewer borders"). */}
            <div className="rounded-xl bg-gold-500/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-300/80">
                What suppliers will see
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-bone-300">
                {summaryLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            {error ? <p className="text-sm text-outbid">{error}</p> : null}
            {created ? (
              <p className="text-sm text-red-300">Posted “{created}”. Suppliers can now respond.</p>
            ) : null}

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post request'}
            </Button>
          </form>
        </Card>

        <div>
          <h2 className="font-display text-lg font-semibold text-bone">My requests</h2>
          <p className="mt-1 text-sm text-bone-500">
            Open a request to compare proposals and award the winner.
          </p>
          <div className="mt-4">
            {rows === null ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : listError && rows.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-outbid">{listError}</p>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => void refreshList(token)}>
                    Retry
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-2">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(r) => r.id}
                  minWidth={420}
                  empty="You haven’t posted any requests yet."
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
