import { EvoGate } from '../../components/evolution/EvoGate';
import { MfaGate } from '../../components/MfaGate';
import { ControlCentre } from '../../components/evolution/ControlCentre';

/**
 * Operator Control Centre route (E11). Flag-gated (`controlCentre`) so the URL always resolves, then
 * MFA-gated for privileged staff. Authorization is enforced by the server — the Control Centre
 * surfaces a 403 inline as "You don't have operator access." There is no client-side role check.
 */
export default function ControlCentrePage() {
  return (
    <EvoGate flag="controlCentre" title="Operator Control Centre">
      <MfaGate requireEnrollment>
        <ControlCentre />
      </MfaGate>
    </EvoGate>
  );
}
