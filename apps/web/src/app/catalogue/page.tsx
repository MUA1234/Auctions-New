import Link from 'next/link';
import { Card, Chip } from '@singha/ui';
import { apiGet, type CatalogueLot } from '../../lib/api';
import { formatMoney, timeLeft } from '../../lib/format';

export const dynamic = 'force-dynamic';

export default async function CataloguePage() {
  let lots: CatalogueLot[] = [];
  let failed = false;
  try {
    lots = await apiGet<CatalogueLot[]>('/catalogue');
  } catch {
    failed = true;
  }

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Catalogue</h1>
      <p className="mt-2 text-bone-400">Live and upcoming lots across every category.</p>

      {failed ? (
        <Card className="mt-8">
          <p className="text-bone-400">The catalogue is unavailable right now.</p>
        </Card>
      ) : lots.length === 0 ? (
        <Card className="mt-8">
          <p className="text-bone-400">No live lots yet — check back soon.</p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <Link key={lot.id} href={`/lot/${lot.id}`}>
              <Card className="flex h-full flex-col gap-3 transition-colors hover:border-red-500/30">
                <div className="flex items-center justify-between">
                  <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
                  <span className="text-xs text-bone-500">{lot.reference}</span>
                </div>
                <div
                  className="hud-cut-sm aspect-[4/3] w-full bg-gradient-to-br from-coal-700/60 to-coal-900/80"
                  aria-hidden
                />
                <h3 className="font-display text-base font-semibold text-bone">{lot.title}</h3>
                <p className="text-xs capitalize text-bone-500">{lot.category}</p>
                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-bone-500">Current bid</p>
                    <span className="tabular font-display text-lg font-bold text-gold-400">
                      {formatMoney(lot.currentBidMinor, lot.currency)}
                    </span>
                  </div>
                  <span className="text-xs text-bone-400">{timeLeft(lot.endsAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
