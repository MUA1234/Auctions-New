import type { Metadata } from 'next';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { LogisticsCentre } from '../../../components/evolution/LogisticsCentre';

export const metadata: Metadata = {
  title: 'Logistics — Incoterms, freight quotes & shipment tracking',
  description:
    'Reference Incoterms and ports, request an indicative freight quote, book it, and track the shipment on an append-only timeline.',
};

/**
 * `/services/logistics` (Singha Evolution E7). Thin wrapper: the route always resolves, and the
 * `logistics` capability flag decides whether the surface renders (via `EvoGate`) or a calm
 * "not enabled yet" fallback shows. Preview with `?evo=on`.
 */
export default function LogisticsPage() {
  return (
    <EvoGate flag="logistics" title="Logistics is not enabled yet">
      <LogisticsCentre />
    </EvoGate>
  );
}
