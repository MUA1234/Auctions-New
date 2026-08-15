'use client';
import { type FormEvent, useEffect, useState } from 'react';
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
import { QuantityUnitInput } from './QuantityUnitInput';
import { StatusChip } from '../../components/StatusChip';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import { CURRENCIES, humanize } from '../../lib/format';
import {
  createProcurementRequest,
  fetchMyProcurementRequests,
  type ProcurementRequest,
} from '../../lib/evolution-api';

/**
 * Procurement hub (E9 · pack doc 09). The demand side of the exchange: a buyer posts a requirement
 * — RFQ, request-supply or reverse-tender — and verified suppliers respond with priced, comparable
 * proposals. This surface creates requests and lists the buyer's own; comparison + award happen on
 * the per-request detail. The auction/offer engine is authoritative — the UI never settles a deal.
 */

const TYPE_OPTIONS = [
  { value: 'RFQ', label: 'RFQ — Request for Quote' },
  { value: 'REQUEST_SUPPLY', label: 'Request Supply' },
  { value: 'REVERSE_TENDER', label: 'Reverse tender' },
];
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
          setListError(e instanceof Error ? e.message : 'Could not load your requests.');
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
          deliveryBy: deliveryBy || undefined,
          currency,
          paymentTerms: paymentTerms.trim() || undefined,
          submissionCloseAt: submissionCloseAt || undefined,
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
      setError(err instanceof Error ? err.message : 'Could not post your request.');
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
      render: (r) => <span className="text-bone-300">{humanize(r.type)}</span>,
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
          Raise an RFQ, request recurring supply or run a reverse tender. Verified suppliers return
          priced, comparable proposals with delivery and payment terms — and you choose the winner.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-bone">New request</h2>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field label="Request type" htmlFor="pr-type" required>
              <Select
                id="pr-type"
                options={TYPE_OPTIONS}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </Field>
            <Field label="Title" htmlFor="pr-title" required>
              <TextInput
                id="pr-title"
                placeholder="e.g. 200 MT red onion to Colombo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="pr-category">
                <TextInput
                  id="pr-category"
                  placeholder="e.g. Agriculture · Produce"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Field>
              <Field label="Destination country" htmlFor="pr-dest">
                <TextInput
                  id="pr-dest"
                  placeholder="e.g. LK"
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Specification"
              htmlFor="pr-spec"
              hint="Grade, packing, tolerances, standards…"
            >
              <Textarea
                id="pr-spec"
                rows={3}
                placeholder="Describe exactly what you need."
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
              />
            </Field>
            <Field label="Quantity" htmlFor="pr-qty">
              <QuantityUnitInput
                id="pr-qty"
                quantity={quantity}
                unit={unit}
                onQuantityChange={setQuantity}
                onUnitChange={setUnit}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Currency" htmlFor="pr-currency" required>
                <Select
                  id="pr-currency"
                  options={CURRENCY_OPTIONS}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </Field>
              <Field label="Deliver by" htmlFor="pr-deliver">
                <TextInput
                  id="pr-deliver"
                  type="date"
                  value={deliveryBy}
                  onChange={(e) => setDeliveryBy(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payment terms" htmlFor="pr-terms">
                <TextInput
                  id="pr-terms"
                  placeholder="e.g. 30% advance, balance on delivery"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </Field>
              <Field label="Submissions close" htmlFor="pr-close">
                <TextInput
                  id="pr-close"
                  type="date"
                  value={submissionCloseAt}
                  onChange={(e) => setSubmissionCloseAt(e.target.value)}
                />
              </Field>
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
