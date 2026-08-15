import type { Metadata } from 'next';
import { EvoGate } from '../../../components/evolution/EvoGate';
import { SinghaIdProfile } from '../../../components/evolution/SinghaIdProfile';

export const metadata: Metadata = {
  title: 'Singha ID · Singha',
  description: 'Your unified Singha profile and verification.',
};

export default function SinghaIdPage() {
  return (
    <EvoGate flag="singhaId" title="Singha ID is not enabled yet">
      <SinghaIdProfile />
    </EvoGate>
  );
}
