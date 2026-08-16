'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Chip, Field, Select, Skeleton, Stat, Textarea } from '@singha/ui';
import { Price } from './Price';
import { CurrencyAmountInput } from './CurrencyAmountInput';
import { QuantityUnitInput } from './QuantityUnitInput';
import { friendlyMessage } from './evo-api-error';
import { StatusChip } from '../../components/StatusChip';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import {
  humanize,
  incotermName,
  INCOTERM_OPTIONS,
  parseMoneyToMinor,
  procurementTypeLabel,
} from '../../lib/format';
import {
  awardProcurementRequest,
  closeProcurementRequest,
  fetchMyProcurementRequests,
  fetchProcurementProposals,
  submitProcurementProposal,
  type ProcurementProposalsView,
  type ProcurementRequest,
  type RankedProposal,
} from '../../lib/evolution-api';

/**
 * Procurement request detail (E9 · §09/D4, CX6 pack docs 04/05/07). Shows a request and its
 * RANKED proposals as a readable COMMERCIAL COMPARISON — price and incoterm side by side, stacked
 * comparison cards on mobile / aligned columns on desktop (doc 07), one shared row per proposal so
 * there is never a duplicate control at any width. Ranking is a recommendation only: the lowest
 * price sits at rank #1, but the buyer must explicitly select and confirm a specific proposal to
 * award — nothing is ever auto-awarded (rule 2/11: the UI is not the source of truth and an
 * accepted deal requires explicit confirmation + engine validation). Any signed-in supplier may
 * submit a priced proposal while the window is open.
 *
 * Read-model note (verified against `Auctions-Backend`): `GET /procurement/requests/:id/proposals`
 * returns only `{rank, proposalId, supplierCustomerId, totalPriceMinor, currency, incoterm}` — a
 * supplier's quantity/delivery-date/payment-terms/validity/notes are accepted and stored on
 * submission but not returned here, so this comparison can only show price, incoterm and rank
 * until that read model is enriched (out of scope: backend, frozen for this task).
 */

function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

const ROW_COLS = 'md:grid-cols-[3.5rem_7rem_1fr_1fr_9rem]';

export function ProcurementDetail() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
  const { token, loading } = useAuth();

  const [view, setView] = useState<ProcurementProposalsView | null>(null);
  const [request, setRequest] = useState<ProcurementRequest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // owner award / close state
  const [confirming, setConfirming] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [awardedId, setAwardedId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  // supplier proposal form
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [pQty, setPQty] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [incoterm, setIncoterm] = useState('');
  const [notes, setNotes] = useState('');
  const [proposing, setProposing] = useState(false);
  const [proposalMsg, setProposalMsg] = useState<string | null>(null);
  const [proposalErr, setProposalErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token || !id) return;
    setError(null);
    try {
      const [proposals, mine] = await Promise.all([
        fetchProcurementProposals(id, token),
        fetchMyProcurementRequests(token).catch(() => [] as ProcurementRequest[]),
      ]);
      setView(proposals);
      setRequest(mine.find((r) => r.id === id) ?? null);
    } catch (e: unknown) {
      setError(friendlyMessage(e, 'Could not load this request.'));
    } finally {
      setLoaded(true);
    }
  }, [token, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function doAward(proposalId: string) {
    if (!token) return;
    setAwarding(true);
    setError(null);
    try {
      const res = await awardProcurementRequest(id, proposalId, token);
      setAwardedId(res.awardedProposalId ?? proposalId);
      setConfirming(null);
      await reload();
    } catch (e: unknown) {
      setError(friendlyMessage(e, 'Could not award this request.'));
    } finally {
      setAwarding(false);
    }
  }

  async function doClose() {
    if (!token) return;
    setClosing(true);
    setError(null);
    try {
      await closeProcurementRequest(id, token);
      await reload();
    } catch (e: unknown) {
      setError(friendlyMessage(e, 'Could not close the window.'));
    } finally {
      setClosing(false);
    }
  }

  async function submitProposal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setProposalErr(null);
    setProposalMsg(null);
    const totalPriceMinor = parseMoneyToMinor(amount);
    if (totalPriceMinor == null) {
      setProposalErr('Enter your offered price.');
      return;
    }
    setProposing(true);
    try {
      const q = pQty.trim();
      await submitProcurementProposal(
        id,
        {
          proposal: {
            currency,
            totalPriceMinor,
            quantity: q || undefined,
            quantityUnitCode: q && pUnit ? pUnit : undefined,
            incoterm: incoterm.trim() || undefined,
          },
          notes: notes.trim() || undefined,
        },
        token,
      );
      setProposalMsg('Proposal submitted.');
      setAmount('');
      setPQty('');
      setIncoterm('');
      setNotes('');
      await reload();
    } catch (err: unknown) {
      setProposalErr(friendlyMessage(err, 'Could not submit your proposal. Please try again.'));
    } finally {
      setProposing(false);
    }
  }

  if (loading || (!loaded && token)) {
    return (
      <div className="container-page py-10 sm:py-14">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container-page py-10 sm:py-14">
        <SignInPrompt
          title="Sign in to view this request"
          description="Compare supplier proposals, close the window and award — or, as a supplier, submit your priced proposal."
          next={`/wanted/procurement/${id}`}
        />
      </div>
    );
  }

  if (error && !view) {
    return (
      <div className="container-page py-10 sm:py-14">
        <a href="/wanted/procurement" className="text-sm text-bone-400 hover:text-bone">
          ← All requests
        </a>
        <Card className="mt-6 text-center">
          <p className="text-sm text-outbid">{error}</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => void reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const status = view?.status ?? request?.status ?? 'open';
  const isOwner = Boolean(request);
  const isAwarded = status.toLowerCase() === 'awarded' || Boolean(awardedId);
  const isOpen = status.toLowerCase() === 'open';
  const ranked: RankedProposal[] = view?.ranked ?? [];

  function renderAction(p: RankedProposal) {
    if (awardedId === p.proposalId) return <Chip tone="win">Awarded</Chip>;
    if (!isOwner || isAwarded) return <span className="text-bone-600">—</span>;
    if (confirming === p.proposalId) {
      return (
        <span className="inline-flex items-center gap-2">
          <Button variant="gold" onClick={() => void doAward(p.proposalId)} disabled={awarding}>
            Confirm award
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(null)} disabled={awarding}>
            Cancel
          </Button>
        </span>
      );
    }
    return (
      <Button
        variant="outline"
        aria-label={`Award to rank ${p.rank}`}
        onClick={() => setConfirming(p.proposalId)}
      >
        Award
      </Button>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <a href="/wanted/procurement" className="text-sm text-bone-400 hover:text-bone">
        ← All requests
      </a>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-300">{procurementTypeLabel(request?.type)}</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-bone sm:text-4xl">
            {request?.title ?? `Request ${shortId(id)}`}
          </h1>
        </div>
        <StatusChip status={status} />
      </header>

      {isAwarded ? (
        <Card className="mt-6 border-[#2fae7a]/30">
          <p className="text-sm text-[#5fd0a3]">
            This request has been awarded. The winning supplier has been notified.
          </p>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Suppliers" value={view?.suppliers ?? 0} />
        <Stat label="Priced proposals" value={view?.pricedProposals ?? 0} tone="gold" />
        <Stat label="Status" value={humanize(status)} />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-bone">Compare proposals</h2>
            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">
              Advisory only
            </span>
          </div>
          {isOwner && isOpen && !isAwarded ? (
            <Button variant="dark" onClick={() => void doClose()} disabled={closing}>
              {closing ? 'Closing…' : 'Close window'}
            </Button>
          ) : null}
        </div>

        <p className="mt-1 max-w-2xl text-sm text-bone-500">
          {isOwner
            ? 'Ranking is a recommendation; you choose the winner. The lowest price is ranked #1, but nothing is awarded until you select and confirm a specific proposal.'
            : 'Comparing price and incoterm across every priced proposal. Ranking is advisory — the buyer chooses the winner explicitly; nothing is auto-awarded.'}
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-coal-800/50 to-coal-900/75 backdrop-blur">
          <div
            className={`hidden border-b border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-bone-500 md:grid md:items-center md:gap-4 ${ROW_COLS}`}
          >
            <span>Rank</span>
            <span>Supplier ref</span>
            <span>Price</span>
            <span>Incoterm</span>
            <span className="text-right">Action</span>
          </div>
          {ranked.length === 0 ? (
            <p className="px-4 py-8 text-center text-bone-500">No priced proposals yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {ranked.map((p) => (
                <li
                  key={p.proposalId}
                  className={`p-4 md:grid md:items-center md:gap-4 md:px-4 md:py-3 ${ROW_COLS}`}
                >
                  <div className="flex items-center justify-between md:block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-bone-500 md:hidden">
                      Rank
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-display font-bold text-bone">#{p.rank}</span>
                      {p.rank === 1 ? <Chip tone="gold">Lowest price</Chip> : null}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between md:mt-0 md:block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-bone-500 md:hidden">
                      Supplier ref
                    </span>
                    <span className="text-bone-400">{shortId(p.supplierCustomerId)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between md:mt-0 md:block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-bone-500 md:hidden">
                      Price
                    </span>
                    <Price minor={p.totalPriceMinor} currency={p.currency ?? 'LKR'} />
                  </div>
                  <div className="mt-2 flex items-center justify-between md:mt-0 md:block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-bone-500 md:hidden">
                      Incoterm
                    </span>
                    <span className="text-bone-300" title={incotermName(p.incoterm) ?? undefined}>
                      {p.incoterm ?? '—'}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end md:mt-0">{renderAction(p)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && view ? <p className="mt-3 text-sm text-outbid">{error}</p> : null}
      </section>

      {isOpen && !isAwarded ? (
        <section className="mt-10 max-w-xl">
          <h2 className="font-display text-lg font-semibold text-bone">Submit a proposal</h2>
          <p className="mt-1 text-sm text-bone-500">
            Supplying against this requirement? Send a priced, comparable proposal.
          </p>
          <Card className="mt-4 p-6">
            <form className="space-y-4" onSubmit={submitProposal}>
              <Field label="Your price" htmlFor="pp-amount" required>
                <CurrencyAmountInput
                  id="pp-amount"
                  amount={amount}
                  currency={currency}
                  onAmountChange={setAmount}
                  onCurrencyChange={setCurrency}
                />
              </Field>
              <Field label="Quantity offered" htmlFor="pp-qty">
                <QuantityUnitInput
                  id="pp-qty"
                  quantity={pQty}
                  unit={pUnit}
                  onQuantityChange={setPQty}
                  onUnitChange={setPUnit}
                />
              </Field>
              <Field
                label="Incoterm"
                htmlFor="pp-incoterm"
                hint="How you'll deliver, in standard trade terms."
              >
                <Select
                  id="pp-incoterm"
                  options={INCOTERM_OPTIONS}
                  placeholder="Select incoterm"
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                />
              </Field>
              <Field
                label="Notes"
                htmlFor="pp-notes"
                hint="Lead time, packing, how long this price is valid — anything that helps the buyer compare beyond price."
              >
                <Textarea
                  id="pp-notes"
                  rows={3}
                  placeholder="Lead time, packing, validity…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              {proposalErr ? <p className="text-sm text-outbid">{proposalErr}</p> : null}
              {proposalMsg ? <p className="text-sm text-red-300">{proposalMsg}</p> : null}
              <Button type="submit" variant="primary" disabled={proposing}>
                {proposing ? 'Submitting…' : 'Submit proposal'}
              </Button>
            </form>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
