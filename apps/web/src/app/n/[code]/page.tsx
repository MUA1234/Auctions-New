import { EvoGate } from '../../../components/evolution/EvoGate';
import { NodeLocalSite } from '../../../components/evolution/NodeLocalSite';

/**
 * Public local-site for a Satellite Market Node (E13) at `/n/[code]`. Flag-gated (`satelliteNodes`)
 * but PUBLIC — no MfaGate. It presents the one central inventory attributed to this node.
 */
export default function NodeLocalSitePage() {
  return (
    <EvoGate flag="satelliteNodes" title="Local market">
      <NodeLocalSite />
    </EvoGate>
  );
}
