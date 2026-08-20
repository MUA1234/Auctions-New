'use client';
import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip, Field, Select, Skeleton, Textarea, TextInput } from '@singha/ui';
import { CurrencyAmountInput } from './CurrencyAmountInput';
import { QuantityUnitInput } from './QuantityUnitInput';
import { Price } from './Price';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import { parseMoneyToMinor } from '../../lib/format';
import {
  submitCommercialOffer,
  type OfferProposalInput,
  type OfferView,
} from '../../lib/evolution-api';
import { friendlyMessage } from './evo-api-error';

/**
 * Commercial Offer V2 (E4) — full-terms offer form. The buyer proposes a complete commercial
 * package (binding price + optional quantity, incoterm, delivery, payment terms and validity) on a
 * listing. A "sealed" toggle keeps the amount private until the seller reveals (D4). Money is
 * integer MINOR units end-to-end: the amount is a major-unit string parsed at submit.
 */
const INCOTERMS = [
  { value: 'EXW', label: 'EXW — Ex Works' },
  { value: 'FCA', label: 'FCA — Free Carrier' },
  { value: 'FOB', label: 'FOB — Free On Board' },
  { value: 'CFR', label: 'CFR — Cost and Freight' },
  { value: 'CIF', label: 'CIF — Cost, Insurance & Freight' },
  { value: 'DAP', label: 'DAP — Delivered At Place' },
];

export function CommercialOfferForm({ listingId }: { listingId: string }) {
  const { token, loading: authLoading } = useAuth();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [incoterm, setIncoterm] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [sealed, setSealed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [submitted, setSubmitted] = useState<OfferView | null>(null);

  function reset() {
    setAmount('');
    setQuantity('');
    setUnit('');
    setIncoterm('');
    setDeliveryDate('');
    setPaymentTerms('');
    setValidUntil('');
    setSealed(false);
    setError(null);
    setAmountInvalid(false);
    setSubmitted(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    // Parse against the selected BINDING currency: a JPY offer of 5,000 is 5000 minor units,
    // not 500000 — the exponent, never a hardcoded 100, decides.
    const totalPriceMinor = parseMoneyToMinor(amount, currency);
    if (totalPriceMinor == null) {
      setAmountInvalid(true);
      setError('Enter a valid offer amount.');
      return;
    }
    setAmountInvalid(false);
    setBusy(true);
    setError(null);
    try {
      const proposal: OfferProposalInput = {
        currency,
        totalPriceMinor,
        ...(quantity.trim()
          ? { quantity: quantity.trim(), quantityUnitCode: unit || undefined }
          : {}),
        ...(incoterm ? { incoterm } : {}),
        ...(deliveryDate ? { deliveryDate } : {}),
        ...(paymentTerms.trim() ? { paymentTerms: paymentTerms.trim() } : {}),
        ...(validUntil ? { validUntil } : {}),
      };
      const offer = await submitCommercialOffer({ listingId, sealed, proposal }, token);
      setSubmitted(offer);
    } catch (err) {
      setError(friendlyMessage(err, 'Could not submit your offer.'));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <div className="container-page py-10 sm:py-14">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-6 h-80 w-full max-w-2xl rounded-2xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <SignInPrompt
        title="Make a commercial offer"
        description="Sign in to submit a full-terms commercial offer on this listing."
        next={`/exchange/offer/${listingId}`}
      />
    );
  }

  if (submitted) {
    return (
      <div className="container-page py-10 sm:py-14">
        <header>
          <p className="eyebrow text-gold-300">Singha Exchange</p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Offer submitted</h1>
        </header>
        <Card className="mt-8 max-w-xl">
          <Chip tone="win">Submitted</Chip>
          <h2 className="mt-3 font-serif text-2xl text-bone-100">Your offer is in</h2>
          <p className="mt-2 text-bone-400">
            The seller has received your commercial terms and can respond, counter or award.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price minor={submitted.amountMinor} currency={submitted.currency} />
            {submitted.sealed ? <Chip tone="gold">Sealed</Chip> : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/account/commercial-offers">
              <Button variant="gold">View my offers</Button>
            </Link>
            <Button type="button" variant="ghost" onClick={reset}>
              Submit another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Singha Exchange</p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Make a commercial offer</h1>
        <p className="mt-2 text-bone-400">
          Propose full commercial terms — price, quantity, delivery and validity — for this listing.
        </p>
      </header>

      <form onSubmit={submit} className="mt-8 grid max-w-2xl gap-5">
        <Field
          label="Total offer price"
          required
          htmlFor="offer-amount"
          hint="The binding price for this offer."
          error={amountInvalid ? 'Enter a valid amount greater than zero.' : null}
        >
          <CurrencyAmountInput
            id="offer-amount"
            amount={amount}
            currency={currency}
            invalid={amountInvalid}
            onAmountChange={(v) => {
              setAmount(v);
              setAmountInvalid(false);
            }}
            onCurrencyChange={setCurrency}
          />
        </Field>

        <Field
          label="Quantity"
          htmlFor="offer-qty"
          hint="Optional — for bulk or commodity listings."
        >
          <QuantityUnitInput
            id="offer-qty"
            quantity={quantity}
            unit={unit}
            onQuantityChange={setQuantity}
            onUnitChange={setUnit}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Incoterm" htmlFor="offer-incoterm">
            <Select
              id="offer-incoterm"
              options={INCOTERMS}
              placeholder="Select incoterm"
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value)}
            />
          </Field>
          <Field label="Delivery date" htmlFor="offer-delivery">
            <TextInput
              id="offer-delivery"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Payment terms"
          htmlFor="offer-payment"
          hint="e.g. 30% deposit, balance on delivery."
        >
          <Textarea
            id="offer-payment"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="Describe your proposed payment terms"
          />
        </Field>

        <Field label="Offer valid until" htmlFor="offer-valid">
          <TextInput
            id="offer-valid"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </Field>

        <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-coal-900/40 p-4">
          <input
            type="checkbox"
            checked={sealed}
            onChange={(e) => setSealed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-500"
          />
          <span className="min-w-0">
            <span className="text-sm font-medium text-bone-200">Sealed offer</span>
            <span className="mt-0.5 block text-xs text-bone-500">
              Keep your bid confidential — the seller cannot see your amount until they reveal all
              offers together.
            </span>
          </span>
        </label>
        {sealed ? (
          <p className="-mt-2 text-xs text-gold-300">
            Sealed — your amount stays private until the seller reveals.
          </p>
        ) : null}

        {error ? <p className="text-sm text-outbid">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit offer'}
          </Button>
          <Link href={`/lot/${listingId}`}>
            <Button type="button" variant="ghost">
              Back to listing
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
