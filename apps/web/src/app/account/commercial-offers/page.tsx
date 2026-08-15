'use client';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { MyCommercialOffers } from '../../../components/evolution/MyCommercialOffers';

export default function MyCommercialOffersPage() {
  return (
    <EvoGate flag="commercialOffersV2" title="Commercial offers are not enabled yet">
      <MyCommercialOffers />
    </EvoGate>
  );
}
