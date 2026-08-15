import type { Metadata } from 'next';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { SupplyMatch } from '../../../components/evolution/SupplyMatch';

export const metadata: Metadata = {
  title: 'Find supply — match to supply programmes',
  description:
    'Describe what you need and see a ranked, cheapest-first list of matching supply programmes. A recommendation only — nothing is ordered automatically.',
};

export default function SupplyMatchPage() {
  return (
    <EvoGate flag="supplyProgrammes" title="Supply matching is not enabled yet">
      <SupplyMatch />
    </EvoGate>
  );
}
