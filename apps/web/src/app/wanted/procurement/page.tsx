import type { Metadata } from 'next';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { ProcurementHub } from '../../../components/evolution/ProcurementHub';

export const metadata: Metadata = {
  title: 'Procurement — post an RFQ and source supply',
  description:
    'Post RFQs, request supply and run reverse tenders. Verified suppliers respond with priced, comparable proposals — and you choose the winner.',
};

export default function ProcurementPage() {
  return (
    <EvoGate flag="procurement" title="Procurement is not enabled yet">
      <ProcurementHub />
    </EvoGate>
  );
}
