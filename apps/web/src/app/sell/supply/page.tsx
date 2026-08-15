import type { Metadata } from 'next';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { SupplyProgrammes } from '../../../components/evolution/SupplyProgrammes';

export const metadata: Metadata = {
  title: 'Supply programmes — publish what you can supply',
  description:
    'Publish recurring or on-demand supply — product, capacity, order sizes, indicative pricing and lead time — and let buyers searching the market match to you.',
};

export default function SupplyProgrammesPage() {
  return (
    <EvoGate flag="supplyProgrammes" title="Supply programmes are not enabled yet">
      <SupplyProgrammes />
    </EvoGate>
  );
}
