'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { buyNow, makeOffer, submitEoi, submitTender } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatMoney, parseMoneyToMinor } from '../lib/format';

/**
 * Buyer action panel for every NON-auction sale method (Singha Exchange, docs/07):
 * Buy Now, Make Offer, Sealed Tender and Expression of Interest. Each form calls
 * the server, which is authoritative — the screen only reflects the accepted
 * record. Signed-out buyers get a clear sign-in gate.
 */
export function SalePanel({
  listingId,
  saleMethod,
  currency,
  priceMinor,
}: {
  listingId: string;
  saleMethod: string;
  currency: string;
  priceMinor: number | null;
}) {
  const { token } = useAuth();

  if (!token) {
    const verb =
      saleMethod === 'BUY_NOW'
        ? 'buy this lot'
        : saleMethod === 'MAKE_OFFER'
          ? 'make an offer'
          : saleMethod === 'SEALED_TENDER'
            ? 'submit a sealed bid'
            : 'register your interest';
    return (
      <Card className="flex flex-col gap-3">
        <PriceHeader saleMethod={saleMethod} currency={currency} priceMinor={priceMinor} />
        <p className="text-sm text-bone-400">Sign in to {verb} on this lot.</p>
        <Link href={`/login?next=${encodeURIComponent(`/lot/${listingId}`)}`}>
          <Button variant="gold" className="w-full">
            Sign in to continue
          </Button>
        </Link>
      </Card>
    );
  }

  switch (saleMethod) {
    case 'BUY_NOW':
      return (
        <BuyNowPanel listingId={listingId} currency={currency} priceMinor={priceMinor} token={token} />
      );
    case 'MAKE_OFFER':
      return (
        <OfferPanel listingId={listingId} currency={currency} priceMinor={priceMinor} token={token} />
      );
    case 'SEALED_TENDER':
      return (
        <TenderPanel listingId={listingId} currency={currency} priceMinor={priceMinor} token={token} />
      );
    case 'EOI':
      return <EoiPanel listingId={listingId} currency={currency} token={token} />;
    default:
      return (
        <Card>
          <PriceHeader saleMethod={saleMethod} currency={currency} priceMinor={priceMinor} />
          <p className="mt-3 text-sm text-bone-400">
            This lot is available through the Singha exchange.
          </p>
        </Card>
      );
  }
}

function PriceHeader({
  saleMethod,
  currency,
  priceMinor,
}: {
  saleMethod: string;
  currency: string;
  priceMinor: number | null;
}) {
  const label = saleMethod === 'BUY_NOW' ? 'Buy now price' : 'Guide';
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-bone-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-gold-400">
        {priceMinor != null ? formatMoney(priceMinor, currency) : 'On request'}
      </p>
    </div>
  );
}

/** Shared success confirmation, replaces the form once the server accepts. */
function Done({ title, body, cta }: { title: string; body: string; cta: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-win">
        <span aria-hidden>✓</span>
        <p className="font-display text-lg font-semibold">{title}</p>
      </div>
      <p className="text-sm text-bone-400">{body}</p>
      {cta}
    </Card>
  );
}

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

function BuyNowPanel({
  listingId,
  currency,
  priceMinor,
  token,
}: {
  listingId: string;
  currency: string;
  priceMinor: number | null;
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function purchase() {
    setBusy(true);
    setError(null);
    try {
      await buyNow(listingId, token);
      setDone(true);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Done
        title="Purchase confirmed"
        body="This lot is yours. An invoice has been raised — settle it from your command centre to complete the sale."
        cta={
          <Link href="/dashboard">
            <Button variant="gold" className="w-full">
              Go to my command centre
            </Button>
          </Link>
        }
      />
    );

  return (
    <Card className="flex flex-col gap-4">
      <PriceHeader saleMethod="BUY_NOW" currency={currency} priceMinor={priceMinor} />
      {error && <p className="text-sm text-outbid">{error}</p>}
      {!confirm ? (
        <Button variant="primary" className="w-full" onClick={() => setConfirm(true)}>
          Buy now
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-bone-300">
            Confirm purchase for{' '}
            <span className="font-semibold text-gold-400">
              {priceMinor != null ? formatMoney(priceMinor, currency) : 'the listed price'}
            </span>
            ? This is binding.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" disabled={busy} onClick={purchase}>
              {busy ? 'Confirming…' : 'Confirm purchase'}
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-bone-500">The first confirmed buyer secures the lot.</p>
    </Card>
  );
}

function OfferPanel({
  listingId,
  currency,
  priceMinor,
  token,
}: {
  listingId: string;
  currency: string;
  priceMinor: number | null;
  token: string;
}) {
  const [amount, setAmount] = useState(priceMinor != null ? String(priceMinor / 100) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = parseMoneyToMinor(amount);
    if (amountMinor == null) {
      setError('Enter a valid offer amount.');
      return;
    }
    setBusy(true);
    try {
      await makeOffer(listingId, { amountMinor, currency, note: note || undefined }, token);
      setDone(true);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Done
        title="Offer submitted"
        body="Your private offer has been sent to the seller. You'll be notified if they accept or counter."
        cta={
          <Link href="/account/offers">
            <Button variant="gold" className="w-full">
              Track my offers
            </Button>
          </Link>
        }
      />
    );

  return (
    <Card className="flex flex-col gap-4">
      <PriceHeader saleMethod="MAKE_OFFER" currency={currency} priceMinor={priceMinor} />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm text-bone-400">Your offer ({currency})</label>
        <input
          className="field tabular"
          type="number"
          required
          min={1}
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <label className="text-sm text-bone-400">Note to seller (optional)</label>
        <textarea
          className="field"
          rows={3}
          maxLength={2000}
          placeholder="Anything the seller should know…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-sm text-outbid">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit offer'}
        </Button>
      </form>
      <p className="text-xs text-bone-500">
        Offers are private — competing buyers never see your amount. The seller can accept, counter
        or decline.
      </p>
    </Card>
  );
}

function TenderPanel({
  listingId,
  currency,
  priceMinor,
  token,
}: {
  listingId: string;
  currency: string;
  priceMinor: number | null;
  token: string;
}) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = parseMoneyToMinor(amount);
    if (amountMinor == null) {
      setError('Enter a valid bid amount.');
      return;
    }
    setBusy(true);
    try {
      await submitTender(listingId, { amountMinor, currency }, token);
      setDone(true);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Done
        title="Sealed bid submitted"
        body="Your single sealed bid is locked in. The highest bid is awarded when the tender is opened after the deadline."
        cta={
          <Link href="/dashboard">
            <Button variant="gold" className="w-full">
              Go to my command centre
            </Button>
          </Link>
        }
      />
    );

  return (
    <Card className="flex flex-col gap-4">
      <PriceHeader saleMethod="SEALED_TENDER" currency={currency} priceMinor={priceMinor} />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm text-bone-400">Your sealed bid ({currency})</label>
        <input
          className="field tabular"
          type="number"
          required
          min={1}
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {error && <p className="text-sm text-outbid">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit sealed bid'}
        </Button>
      </form>
      <p className="text-xs text-bone-500">
        One sealed bid per buyer. It stays private until the controlled open — bid your true maximum.
      </p>
    </Card>
  );
}

function EoiPanel({
  listingId,
  currency,
  token,
}: {
  listingId: string;
  currency: string;
  token: string;
}) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [conditions, setConditions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await submitEoi(
        {
          listingId,
          amountMinor: amount ? parseMoneyToMinor(amount) : null,
          currency,
          message: message || undefined,
          conditions: conditions || undefined,
        },
        token,
      );
      setDone(true);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Done
        title="Interest registered"
        body="Thank you — the Singha team will contact qualified buyers as this sale progresses."
        cta={
          <Link href="/account/eoi">
            <Button variant="gold" className="w-full">
              Track my expressions of interest
            </Button>
          </Link>
        }
      />
    );

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-bone-500">
          Expression of interest
        </p>
        <p className="mt-1 font-display text-xl font-semibold text-bone">Register your interest</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm text-bone-400">Indicative amount ({currency}, optional)</label>
        <input
          className="field tabular"
          type="number"
          min={1}
          placeholder="e.g. 5,000,000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <label className="text-sm text-bone-400">Message (optional)</label>
        <textarea
          className="field"
          rows={3}
          maxLength={2000}
          placeholder="Tell the team about your interest…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <label className="text-sm text-bone-400">Conditions (optional)</label>
        <textarea
          className="field"
          rows={2}
          maxLength={2000}
          placeholder="Any conditions to your interest…"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
        />
        {error && <p className="text-sm text-outbid">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Registering…' : 'Register interest'}
        </Button>
      </form>
      <p className="text-xs text-bone-500">
        Your details are private and shared only with the Singha sales team.
      </p>
    </Card>
  );
}
