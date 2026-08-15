import { EvoGate } from '../../../components/evolution/EvoGate';
import { MfaGate } from '../../../components/MfaGate';
import { NodeConsole } from '../../../components/evolution/NodeConsole';

/**
 * Satellite Market Node console route (E13, operator). Flag-gated (`satelliteNodes`) then MFA-gated.
 * The backend authorizes origination; a node never owns records.
 */
export default function NodeConsolePage() {
  return (
    <EvoGate flag="satelliteNodes" title="Satellite Market Nodes">
      <MfaGate requireEnrollment>
        <NodeConsole />
      </MfaGate>
    </EvoGate>
  );
}
