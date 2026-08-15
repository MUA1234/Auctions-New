'use client';
import { useParams } from 'next/navigation';
import { EvoGate } from '../../../../components/evolution/EvoGate';
import { SellerOffersConsole } from '../../../../components/evolution/SellerOffersConsole';

export default function SellerOffersPage() {
  const params = useParams<{ listingId: string }>();
  const listingId = String(params?.listingId ?? '');
  return (
    <EvoGate flag="commercialOffersV2" title="Commercial offers are not enabled yet">
      <SellerOffersConsole listingId={listingId} />
    </EvoGate>
  );
}
