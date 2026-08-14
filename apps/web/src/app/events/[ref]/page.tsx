import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@singha/ui';
import { fetchEvent, type EventDetail } from '../../../lib/api';
import { StatusChip } from '../../../components/StatusChip';
import { formatMoney } from '../../../lib/format';

export const dynamic = 'force-dynamic';

function eventDate(iso: string | null): string {
  if (!iso) return 'Date to be announced';
  return new Date(iso).toLocaleDateString('en-LK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const METHOD_LABEL: Record<string, string> = {
  TIMED_AUCTION: 'Timed auction',
  BUY_NOW: 'Buy now',
  MAKE_OFFER: 'Make an offer',
  SEALED_TENDER: 'Sealed tender',
  EOI: 'Interest',
};

export default async function EventDetailPage({ params }: { params: { ref: string } }) {
  let event: EventDetail;
  try {
    event = await fetchEvent(params.ref);
  } catch {
    notFound();
  }

  return (
    <div className="container-page py-12">
      <Link href="/events" className="text-sm text-bone-400 hover:text-bone">
        ← All events
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <StatusChip status={event.status} />
        <span className="text-xs uppercase tracking-wide text-bone-500">
          {event.eventType.replace(/_/g, ' ')}
        </span>
        {event.liveEnabled && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> Live broadcast
          </span>
        )}
      </div>
      <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-bone">{event.title}</h1>
      <p className="mt-2 text-bone-300">{eventDate(event.startsAt)}</p>
      {(event.venue || event.locationCity) && (
        <p className="text-sm text-bone-500">
          {[event.venue, event.locationCity].filter(Boolean).join(' · ')}
        </p>
      )}
      {event.description && (
        <p className="mt-5 max-w-3xl whitespace-pre-line leading-relaxed text-bone-300">
          {event.description}
        </p>
      )}

      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-bone">Catalogue</h2>
        <span className="text-sm text-bone-500">
          {event.lots.length} {event.lots.length === 1 ? 'lot' : 'lots'}
        </span>
      </div>

      {event.lots.length === 0 ? (
        <Card className="mt-4 text-center text-bone-400">
          Lots for this event are being finalised. Check back soon.
        </Card>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {event.lots.map((lot) => (
            <li key={lot.listingId}>
              <Link href={`/lot/${lot.listingId}`} className="group block">
                <Card className="flex flex-wrap items-center gap-4 transition-colors group-hover:border-white/20">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] font-display text-sm font-bold text-gold-400">
                    {lot.sequence}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-bone group-hover:text-white">
                      {lot.title}
                    </p>
                    <p className="text-xs capitalize text-bone-500">
                      {lot.category} · {METHOD_LABEL[lot.saleMethod] ?? lot.saleMethod} ·{' '}
                      {lot.reference}
                    </p>
                  </div>
                  {lot.currentBidMinor != null && (
                    <span className="tabular font-display text-lg font-bold text-gold-400">
                      {formatMoney(lot.currentBidMinor)}
                    </span>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
