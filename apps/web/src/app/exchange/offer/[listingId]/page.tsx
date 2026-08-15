'use client';
import { useParams } from 'next/navigation';
import { EvoGate } from '../../../../components/evolution/EvoGate';
import { CommercialOfferForm } from '../../../../components/evolution/CommercialOfferForm';

export default function CommercialOfferPage() {
  const params = useParams<{ listingId: string }>();
  const listingId = String(params?.listingId ?? '');
  return (
    <EvoGate flag="commercialOffersV2" title="Commercial offers are not enabled yet">
      <CommercialOfferForm listingId={listingId} />
    </EvoGate>
  );
}
