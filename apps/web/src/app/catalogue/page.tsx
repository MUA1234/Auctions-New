import { CatalogueBrowser } from '../../components/CatalogueBrowser';

export const dynamic = 'force-dynamic';

export default function CataloguePage({
  searchParams,
}: {
  searchParams: { category?: string; method?: string };
}) {
  return (
    <div className="container-wide py-14">
      <p className="eyebrow">The exchange</p>
      <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-bone sm:text-5xl">
        Catalogue
      </h1>
      <p className="mt-3 max-w-2xl text-bone-400">
        Live and upcoming lots across every category — browse in Flow, Grid or List.
      </p>
      <CatalogueBrowser
        initialCategory={searchParams.category ?? ''}
        initialSaleMethod={searchParams.method ?? ''}
      />
    </div>
  );
}
