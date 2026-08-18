import Link from 'next/link';

/**
 * §23 (RW7) — "local opportunities" as a lightweight, config-driven editorial strip (rule 13: the
 * homepage never renders a full catalogue). Each region links into the catalogue's real server-side
 * `location` filter, so the entries are genuine entry points, not decoration. The list is data here
 * (not hardcoded markup) so it stays trivially editable and can later be driven by a real
 * location/geo surface without touching layout.
 */
const REGIONS: { name: string; blurb: string }[] = [
  { name: 'Colombo', blurb: 'Vehicles, machinery & city assets' },
  { name: 'Gampaha', blurb: 'Commercial fleet & equipment' },
  { name: 'Kandy', blurb: 'Property, land & estate lots' },
  { name: 'Galle', blurb: 'Southern coast disposals' },
  { name: 'Kurunegala', blurb: 'Agricultural & plant machinery' },
  { name: 'Jaffna', blurb: 'Northern regional inventory' },
];

export function HomeLocalOpportunities() {
  return (
    <section className="container-wide py-20">
      <div className="mb-9 flex items-center justify-between gap-3">
        <h2 className="font-serif text-3xl font-bold text-bone">Opportunities near you</h2>
        <Link href="/catalogue" className="text-sm text-red-400 hover:text-red-300">
          Browse all regions →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((r) => (
          <Link
            key={r.name}
            href={`/catalogue?location=${encodeURIComponent(r.name)}`}
            className="group block"
          >
            <div className="card-premium flex items-center justify-between gap-4 p-5 transition-colors group-hover:border-white/20">
              <div>
                <p className="font-display text-base font-semibold text-bone group-hover:text-white">
                  {r.name}
                </p>
                <p className="mt-0.5 text-sm text-bone-500">{r.blurb}</p>
              </div>
              <span
                aria-hidden
                className="text-bone-500 transition-colors group-hover:text-gold-400"
              >
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
