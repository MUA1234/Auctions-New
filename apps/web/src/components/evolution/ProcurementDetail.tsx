'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Button,
  Card,
  Chip,
  DataTable,
  Field,
  Skeleton,
  Stat,
  TextInput,
  Textarea,
  type Column,
} from '@singha/ui';
import { Price } from './Price';
import { CurrencyAmountInput } from './CurrencyAmountInput';
import { QuantityUnitInput } from './QuantityUnitInput';
import { StatusChip } from '../../components/StatusChip';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import { humanize, parseMoneyToMinor } from '../../lib/format';
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
 * Procurement request detail (E9 · §09/D4). Shows a request and its RANKED proposals. Ranking is a
 * recommendation only: the lowest price sits at rank #1, but the buyer must explicitly select and
 * confirm a specific proposal to award — nothing is ever auto-awarded (rule 2/11: the UI is not the
 * source of truth and an accepted deal requires explicit confirmation + engine validation). Any
 * signed-in supplier may submit a priced proposal while the window is open.
 */

function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

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
      setError(e instanceof Error ? e.message : 'Could not load this request.');
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
      setError(e instanceof Error ? e.message : 'Could not award this request.');
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
      setError(e instanceof Error ? e.message : 'Could not close the window.');
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
      setProposalErr(err instanceof Error ? err.message : 'Could not submit your proposal.');
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

  const columns: Column<RankedProposal>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (p) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-display font-bold text-bone">#{p.rank}</span>
          {p.rank === 1 ? <Chip tone="gold">Lowest price</Chip> : null}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (p) => <span className="text-bone-400">{shortId(p.supplierCustomerId)}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => <Price minor={p.totalPriceMinor} currency={p.currency ?? 'LKR'} />,
    },
    {
      key: 'incoterm',
      header: 'Incoterm',
      render: (p) => <span className="text-bone-300">{p.incoterm ?? '—'}</span>,
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (p) => {
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
      },
    },
  ];

  return (
    <div className="container-page py-10 sm:py-14">
      <a href="/wanted/procurement" className="text-sm text-bone-400 hover:text-bone">
        ← All requests
      </a>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-300">{humanize(request?.type ?? 'Request')}</p>
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
          <h2 className="font-display text-lg font-semibold text-bone">Ranked proposals</h2>
          {isOwner && isOpen && !isAwarded ? (
            <Button variant="dark" onClick={() => void doClose()} disabled={closing}>
              {closing ? 'Closing…' : 'Close window'}
            </Button>
          ) : null}
        </div>

        {isOwner ? (
          <p className="mt-1 max-w-2xl text-sm text-bone-500">
            Ranking is a recommendation; you choose the winner. The lowest price is ranked #1, but
            nothing is awarded until you select and confirm a specific proposal.
          </p>
        ) : null}

        <Card className="mt-4 p-2">
          <DataTable
            columns={columns}
            rows={ranked}
            rowKey={(p) => p.proposalId}
            minWidth={560}
            empty="No priced proposals yet."
          />
        </Card>
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
              <Field label="Incoterm" htmlFor="pp-incoterm">
                <TextInput
                  id="pp-incoterm"
                  placeholder="e.g. CIF Colombo"
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                />
              </Field>
              <Field label="Notes" htmlFor="pp-notes">
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
