'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Chip, DataTable, EmptyState, Skeleton, Stat, type Column } from '@singha/ui';
import { CurrencyAmountInput } from './CurrencyAmountInput';
import { Price } from './Price';
import { SignInPrompt } from '../../components/SignInPrompt';
import { StatusChip } from '../../components/StatusChip';
import { useAuth } from '../../lib/auth';
import { parseMoneyToMinor } from '../../lib/format';
import {
  acceptCommercialOffer,
  awardSealedOffer,
  counterCommercialOffer,
  fetchOffersForListing,
  rejectCommercialOffer,
  revealSealedOffers,
  type OfferView,
  type SealedListingView,
  type SealedRankedOffer,
} from '../../lib/evolution-api';
import { friendlyMessage } from './evo-api-error';

/**
 * Sealed Offer (E4) seller console — compare and select the winning commercial offer for a listing.
 *
 * Sealed listings hide every amount until the seller explicitly reveals them (an audited, one-way
 * action). After reveal the offers are shown ranked, but the highest is NEVER auto-awarded (rule
 * D4): the seller must pick a specific row and confirm, which binds the sale. Open (non-sealed)
 * offers skip the reveal step and additionally support counter / accept / reject.
 */
interface ConsoleRow {
  offerId: string;
  rank: number;
  amountMinor: number | null;
  currency: string;
  revisionNumber?: number | null;
  status?: string;
  sealed: boolean;
}

function errMsg(e: unknown, fallback: string): string {
  return friendlyMessage(e, fallback);
}

export function SellerOffersConsole({ listingId }: { listingId: string }) {
  const { token, loading: authLoading } = useAuth();

  const [view, setView] = useState<SealedListingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [busy, setBusy] = useState(false); // reveal (page-level action)
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [confirmAward, setConfirmAward] = useState<string | null>(null);
  const [awarded, setAwarded] = useState<string | null>(null);

  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterCurrency, setCounterCurrency] = useState('LKR');
  const [counterInvalid, setCounterInvalid] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setView(null);
    setError(null);
    setAwarded(null);
    setConfirmAward(null);
    setCounterFor(null);
    fetchOffersForListing(listingId, token)
      .then((data) => {
        if (alive) setView(data);
      })
      .catch((err) => {
        if (alive) setError(errMsg(err, 'Failed to load offers for this listing.'));
      });
    return () => {
      alive = false;
    };
  }, [token, listingId, reload]);

  const isSealed = Boolean(view?.sealed);
  const preReveal = isSealed && !view?.revealed;

  const rows: ConsoleRow[] = useMemo(() => {
    if (!view || preReveal) return [];
    if (isSealed) {
      const ranked = (view.offers as SealedRankedOffer[] | undefined) ?? [];
      return ranked.map((o) => ({
        offerId: o.offerId,
        rank: o.rank,
        amountMinor: o.amountMinor,
        currency: o.currency ?? 'LKR',
        revisionNumber: o.revisionNumber ?? null,
        sealed: true,
      }));
    }
    const open = [...((view.offers as OfferView[] | undefined) ?? [])];
    open.sort((a, b) => (b.amountMinor ?? 0) - (a.amountMinor ?? 0));
    return open.map((o, i) => ({
      offerId: o.id,
      rank: i + 1,
      amountMinor: o.amountMinor,
      currency: o.currency,
      status: o.status,
      sealed: false,
    }));
  }, [view, isSealed, preReveal]);

  const hasRevision = rows.some((r) => r.revisionNumber != null);
  const awardedRank = awarded ? rows.find((r) => r.offerId === awarded)?.rank : undefined;

  async function reveal() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await revealSealedOffers(listingId, token);
      setView(updated);
    } catch (err) {
      setError(errMsg(err, 'Could not reveal the sealed offers.'));
    } finally {
      setBusy(false);
    }
  }

  async function doAward(offerId: string) {
    if (!token) return;
    setRowBusy(offerId);
    setError(null);
    try {
      await awardSealedOffer(listingId, offerId, token);
      setAwarded(offerId);
      setConfirmAward(null);
    } catch (err) {
      setError(errMsg(err, 'Could not award this offer.'));
    } finally {
      setRowBusy(null);
    }
  }

  async function accept(offerId: string) {
    if (!token) return;
    setRowBusy(offerId);
    setError(null);
    try {
      await acceptCommercialOffer(offerId, token);
      setAwarded(offerId);
    } catch (err) {
      setError(errMsg(err, 'Could not accept this offer.'));
    } finally {
      setRowBusy(null);
    }
  }

  async function reject(offerId: string) {
    if (!token) return;
    setRowBusy(offerId);
    setError(null);
    try {
      await rejectCommercialOffer(offerId, token);
      setReload((n) => n + 1);
    } catch (err) {
      setError(errMsg(err, 'Could not reject this offer.'));
    } finally {
      setRowBusy(null);
    }
  }

  async function sendCounter() {
    if (!token || !counterFor) return;
    const totalPriceMinor = parseMoneyToMinor(counterAmount);
    if (totalPriceMinor == null) {
      setCounterInvalid(true);
      return;
    }
    setCounterInvalid(false);
    setRowBusy(counterFor);
    setError(null);
    try {
      await counterCommercialOffer(
        counterFor,
        { proposal: { currency: counterCurrency, totalPriceMinor } },
        token,
      );
      setCounterFor(null);
      setCounterAmount('');
      setReload((n) => n + 1);
    } catch (err) {
      setError(errMsg(err, 'Could not send the counter offer.'));
    } finally {
      setRowBusy(null);
    }
  }

  function renderActions(r: ConsoleRow) {
    if (awarded) {
      return r.offerId === awarded ? (
        <Chip tone="win">Won</Chip>
      ) : (
        <Chip tone="neutral">Closed</Chip>
      );
    }
    if (confirmAward === r.offerId) {
      return (
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs text-bone-400">Award this offer? This binds the sale.</span>
          <div className="flex gap-2">
            <Button
              variant="gold"
              className="px-3 py-1.5 text-xs"
              disabled={rowBusy === r.offerId}
              onClick={() => doAward(r.offerId)}
            >
              {rowBusy === r.offerId ? 'Awarding…' : 'Confirm award'}
            </Button>
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => setConfirmAward(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="gold"
          className="px-3 py-1.5 text-xs"
          onClick={() => setConfirmAward(r.offerId)}
        >
          Award
        </Button>
        {!r.sealed ? (
          <>
            <Button
              variant="outline"
              className="px-3 py-1.5 text-xs"
              onClick={() => {
                setCounterFor(r.offerId);
                setCounterInvalid(false);
              }}
            >
              Counter
            </Button>
            <Button
              variant="dark"
              className="px-3 py-1.5 text-xs"
              disabled={rowBusy === r.offerId}
              onClick={() => accept(r.offerId)}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              disabled={rowBusy === r.offerId}
              onClick={() => reject(r.offerId)}
            >
              Reject
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  const columns: Column<ConsoleRow>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (r) => <span className="tabular font-semibold text-bone-200">#{r.rank}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <Price minor={r.amountMinor} currency={r.currency} />,
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (r) => <span className="text-bone-400">{r.currency}</span>,
    },
    ...(hasRevision
      ? [
          {
            key: 'rev',
            header: 'Rev',
            align: 'right' as const,
            render: (r: ConsoleRow) => (
              <span className="tabular text-bone-400">
                {r.revisionNumber != null ? `r${r.revisionNumber}` : '—'}
              </span>
            ),
          },
        ]
      : []),
    ...(!isSealed
      ? [
          {
            key: 'status',
            header: 'Status',
            render: (r: ConsoleRow) => (r.status ? <StatusChip status={r.status} /> : null),
          },
        ]
      : []),
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (r) => renderActions(r),
    },
  ];

  const header = (
    <header>
      <p className="eyebrow text-gold-300">Singha Exchange</p>
      <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Offers received</h1>
      <p className="mt-2 text-bone-400">
        Compare the offers on this listing and award the one you choose.
      </p>
    </header>
  );

  if (authLoading) {
    return (
      <div className="container-page py-10 sm:py-14">
        {header}
        <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <SignInPrompt
        title="Offers on your listing"
        description="Sign in as the seller to review and award the offers received."
        next={`/sell/offers/${listingId}`}
      />
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      {header}

      <div className="mt-8">
        {error ? (
          <Card className="text-center">
            <p className="text-sm text-outbid">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setReload((n) => n + 1)}>
              Retry
            </Button>
          </Card>
        ) : view == null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : preReveal ? (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Stat label="Participants" value={view.participants ?? 0} />
              <Stat label="Offers received" value={view.offersReceived ?? 0} />
            </div>
            <Card className="mt-6 max-w-xl">
              <Chip tone="gold">Sealed</Chip>
              <p className="mt-3 text-sm text-bone-300">
                Every amount is hidden until you reveal. Revealing shows all offers at once so no
                bidder is disadvantaged.
              </p>
              <p className="mt-2 text-xs text-outbid">Revealing is audited and cannot be undone.</p>
              <Button variant="primary" className="mt-4" disabled={busy} onClick={reveal}>
                {busy ? 'Revealing…' : 'Reveal sealed offers'}
              </Button>
            </Card>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No offers yet"
            description="When buyers submit commercial offers on this listing they will appear here to compare."
          />
        ) : (
          <div>
            {awarded ? (
              <Card className="mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="win">Awarded</Chip>
                  <p className="text-sm text-bone-200">
                    Offer #{awardedRank} awarded — this binds the sale. The other offers are now
                    closed.
                  </p>
                </div>
              </Card>
            ) : (
              <p className="mb-3 text-xs text-bone-500">
                The highest offer is not awarded automatically (rule D4). Select a specific row and
                confirm to bind the sale.
              </p>
            )}

            <Card className="p-0">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.offerId}
                minWidth={isSealed ? 560 : 720}
              />
            </Card>

            {counterFor && !awarded ? (
              <Card className="mt-4 max-w-xl">
                <p className="text-sm font-medium text-bone-200">Counter this offer</p>
                <p className="mt-1 text-xs text-bone-500">
                  Propose a revised price. The buyer can accept, decline or counter again.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <CurrencyAmountInput
                    id="counter-amount"
                    amount={counterAmount}
                    currency={counterCurrency}
                    invalid={counterInvalid}
                    onAmountChange={(v) => {
                      setCounterAmount(v);
                      setCounterInvalid(false);
                    }}
                    onCurrencyChange={setCounterCurrency}
                  />
                  <Button variant="primary" disabled={rowBusy === counterFor} onClick={sendCounter}>
                    {rowBusy === counterFor ? 'Sending…' : 'Send counter'}
                  </Button>
                  <Button variant="ghost" onClick={() => setCounterFor(null)}>
                    Cancel
                  </Button>
                </div>
                {counterInvalid ? (
                  <p className="mt-2 text-sm text-outbid">Enter a valid counter amount.</p>
                ) : null}
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
