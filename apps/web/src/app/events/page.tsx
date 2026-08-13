import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@singha/ui';
import { fetchEvents, type EventSummary } from '../../lib/api';
import { StatusChip } from '../../components/StatusChip';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Auction events',
  description: 'Upcoming and live Singha auction events — curated sales across every category.',
};

function eventDate(iso: string | null): string {
  if (!iso) return 'Date to be announced';
  return new Date(iso).toLocaleDateString('en-LK', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function EventsPage() {
  let events: EventSummary[] = [];
  try {
    events = await fetchEvents();
  } catch {
    events = [];
  }

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Auction events</h1>
      <p className="mt-2 max-w-2xl text-bone-400">
        Curated live and timed sales — vehicles, machinery, gems, property and business assets,
        brought together into a single catalogue you can follow lot by lot.
      </p>

      {events.length === 0 ? (
        <Card className="mt-10 text-center">
          <p className="text-bone-300">No events are scheduled right now.</p>
          <Link href="/catalogue" className="mt-3 inline-block text-sm text-gold-400">
            Browse the live catalogue →
          </Link>
        </Card>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} href={`/events/${e.publicRef}`} className="group block">
              <Card className="flex h-full flex-col transition-colors group-hover:border-white/20">
                <div className="flex items-center justify-between gap-2">
                  <StatusChip status={e.status} />
                  {e.liveEnabled && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-300">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> Live
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-xl font-bold text-bone group-hover:text-white">
                  {e.title}
                </h2>
                <p className="mt-1 text-sm capitalize text-bone-500">
                  {e.eventType.replace(/_/g, ' ')}
                  {e.locationCity ? ` · ${e.locationCity}` : ''}
                </p>
                <p className="mt-4 text-sm text-bone-300">{eventDate(e.startsAt)}</p>
                <p className="mt-auto pt-4 text-xs text-bone-500">
                  {e.lotCount} {e.lotCount === 1 ? 'lot' : 'lots'} · View catalogue →
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
