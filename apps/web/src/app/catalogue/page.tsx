import { Card } from '@singha/ui';
import { CatalogueBrowser } from '../../components/CatalogueBrowser';
import { apiGet, type CatalogueLot } from '../../lib/api';

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
      <p className="mt-2 text-bone-400">
        Live and upcoming lots across every category — as a Cube, Grid or List.
      </p>

      {failed ? (
        <Card className="mt-8">
          <p className="text-bone-400">The catalogue is unavailable right now.</p>
        </Card>
      ) : (
        <CatalogueBrowser lots={lots} />
      )}
    </div>
  );
}
