import type { Metadata } from 'next';
import { EvoGate } from '../../../../components/evolution/EvoGate';
import { ProcurementDetail } from '../../../../components/evolution/ProcurementDetail';

export const metadata: Metadata = {
  title: 'Procurement request — compare and award',
  description:
    'Compare ranked supplier proposals and award the winner, or submit a priced proposal as a supplier. Ranking is a recommendation; the buyer chooses the winner.',
};

export default function ProcurementDetailPage() {
  return (
    <EvoGate flag="procurement" title="Procurement is not enabled yet">
      <ProcurementDetail />
    </EvoGate>
  );
}
