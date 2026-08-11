import { CatalogueBrowser } from '../../components/CatalogueBrowser';

export const dynamic = 'force-dynamic';

export default function CataloguePage() {
  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Catalogue</h1>
      <p className="mt-2 text-bone-400">
        Live and upcoming lots across every category — browse as Rubik bands, Grid or List.
      </p>
      <CatalogueBrowser />
    </div>
  );
}
