import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chip } from '@singha/ui';
import { fetchEvent, type EventDetail } from '../../../lib/api';
import { LiveFloorRoom } from '../../../components/live/LiveFloorRoom';

export const dynamic = 'force-dynamic';

/**
 * §21/§22 (RW6) — a live event's room. Server-resolves the event (by id or publicRef), then the
 * client LiveFloorRoom polls the AUTHORITATIVE floor projection (on-block lot, auctioneer call
 * state, engine bid, running order). The auction engine — not the screen — is the source of truth.
 */
export default async function LiveEventPage({ params }: { params: { ref: string } }) {
  let event: EventDetail;
  try {
    event = await fetchEvent(params.ref);
  } catch {
    notFound();
  }

  return (
    <div className="container-page pb-28 pt-12 lg:pb-12">
      <Link href="/live" className="text-sm text-bone-400 hover:text-bone">
        ← Back to Singha Live
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Chip tone="live">Singha Live</Chip>
        <span className="text-xs uppercase tracking-wide text-bone-500">{event.status}</span>
      </div>
      <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-bone">{event.title}</h1>
      {event.locationCity && <p className="mt-1 text-bone-500">{event.locationCity}</p>}

      <LiveFloorRoom eventId={event.id} />
    </div>
  );
}
