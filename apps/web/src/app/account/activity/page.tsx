import type { Metadata } from 'next';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { ExchangeActivity } from '../../../components/evolution/ExchangeActivity';

export const metadata: Metadata = {
  title: 'Exchange activity · Singha',
  description: 'Your buying, selling and verification across Singha.',
};

export default function ActivityPage() {
  return (
    <EvoGate flag="dashboard" title="Your activity dashboard is not enabled yet">
      <ExchangeActivity />
    </EvoGate>
  );
}
