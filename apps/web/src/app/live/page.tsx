import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import {
  fetchCatalogueV2,
  fetchEvents,
  type CatalogueCardV2,
  type EventSummary,
} from '../../lib/api';
import { SaleCard } from '../../components/SaleCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Singha Live — live & hybrid auctions',
  description:
    'Live and hybrid auction events on Singha — bid in real time against the room. The auction engine is always the source of truth.',
};

/**
 * Singha Live landing (pack modules "Singha Live" + doc 10 truthful status).
 * Surfaces REAL live/hybrid lots from the authoritative catalogue and links into
 * each lot's live room. It deliberately shows no fake broadcast playback: the
 * interactive video room streams only during scheduled events and is operated by
 * staff. The auction engine — not the stream — is authoritative (rule 12).
 */
export default async function LivePage() {
  const lots = await fetchCatalogueV2({ saleMethod: 'LIVE_HYBRID', sort: 'ending', limit: 12 })
    .then((r) => r.items)
    .catch(() => [] as CatalogueCardV2[]);

  const liveNow = lots.filter((l) => l.status.toLowerCase() === 'live');
  const upcoming = lots.filter((l) => l.status.toLowerCase() !== 'live');

  // §21/§22 (RW6) — live auction EVENTS, each opening into its own live-floor room.
  const events = await fetchEvents()
    .then((es) => es.filter((e) => e.liveEnabled))
    .catch(() => [] as EventSummary[]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="hud-grid absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="container-page relative py-20 sm:py-28">
          <Chip tone="live">Singha Live</Chip>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold text-bone sm:text-5xl">
            Live &amp; hybrid auctions, in real time
          </h1>
          <p className="mt-4 max-w-2xl text-bone-400">
            Watch and bid against the room as the auctioneer calls each lot. Hybrid events combine
            the live floor with online bidding — every bid is validated and sequenced by the auction
            engine, so the screen is never the record.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalogue?method=LIVE_HYBRID">
              <Button variant="gold">Browse live &amp; hybrid lots</Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="ghost">How bidding works</Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page py-14">
        {/* Live auction events — each opens its own live-floor room (RW6). */}
        {events.length > 0 && (
          <section className="mb-14">
            <h2 className="font-serif text-2xl font-semibold text-bone">Live auction events</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <Link key={e.id} href={`/live/${e.publicRef}`} className="group block">
                  <Card className="flex h-full flex-col gap-2 p-5 transition-colors group-hover:border-white/20">
                    <div className="flex items-center justify-between gap-2">
                      <Chip tone={e.status.toLowerCase() === 'live' ? 'live' : 'neutral'}>
                        {e.status.toLowerCase() === 'live' ? 'Live now' : e.status}
                      </Chip>
                      <span className="text-xs text-bone-500">{e.lotCount} lots</span>
                    </div>
                    <p className="font-serif text-lg font-semibold text-bone group-hover:text-white">
                      {e.title}
                    </p>
                    {e.locationCity && <p className="text-sm text-bone-500">{e.locationCity}</p>}
                    <span className="mt-auto pt-2 text-sm text-red-400">Enter the live room →</span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Live now */}
        {liveNow.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <h2 className="font-serif text-2xl font-semibold text-bone">Live now</h2>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {liveNow.map((lot) => (
                <SaleCard key={lot.id} lot={lot} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming / scheduled */}
        <section>
          <h2 className="font-serif text-2xl font-semibold text-bone">
            {liveNow.length > 0 ? 'Upcoming live lots' : 'Scheduled live & hybrid lots'}
          </h2>
          {upcoming.length > 0 ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((lot) => (
                <SaleCard key={lot.id} lot={lot} />
              ))}
            </div>
          ) : (
            liveNow.length === 0 && (
              <Card className="mt-5">
                <p className="text-bone-300">No live or hybrid events are scheduled right now.</p>
                <p className="mt-2 text-sm text-bone-500">
                  Live events are announced ahead of time. In the meantime, browse timed auctions in
                  the catalogue — you can watch any lot and get notified as it opens.
                </p>
                <Link href="/catalogue" className="mt-4 inline-block text-sm text-red-400">
                  Browse the catalogue →
                </Link>
              </Card>
            )
          )}
        </section>

        {/* Truthful note about the broadcast experience */}
        <p className="mt-12 max-w-2xl text-xs text-bone-500">
          The interactive broadcast room opens for each event at its scheduled start time.
          Recordings and replays are published after the event. Singha Live is rolling out
          progressively; where a broadcast is not yet available a lot still runs as a fully
          authoritative online auction.
        </p>
      </div>
    </>
  );
}
