'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Chip } from '@singha/ui';
import { apiGetAuthed, apiPost, type SellerListing } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { MfaGate } from '../../components/MfaGate';
import { StaffNav } from '../../components/StaffNav';

/**
 * Staff approvals queue (docs/05/06, Phase 5): listings awaiting review/publish.
 * Actions are server-authorized (listing:review / listing:publish) — a token
 * without the role gets a 403, surfaced inline. Wrapped in an MfaGate so a real
 * staff session must satisfy MFA step-up before the queue is reachable (pack
 * doc 09 "privileged MFA"); the backend enforces the aal2 claim server-side too.
 */
export default function AdminApprovalsPage() {
  return (
    <MfaGate requireEnrollment>
      <AdminApprovals />
    </MfaGate>
  );
}

function AdminApprovals() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<SellerListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    try {
      setQueue(await apiGetAuthed<SellerListing[]>('/listings/review-queue', t));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function act(id: string, action: 'review' | 'publish') {
    if (!token) return;
    setBusy(id + action);
    setError(null);
    try {
      if (action === 'review') {
        await apiPost(`/listings/${id}/review`, { decision: 'approve' }, token);
      } else {
        await apiPost(`/listings/${id}/publish`, {}, token);
      }
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="container-page py-14">
      <StaffNav active="/admin" />
      <h1 className="mt-6 font-serif text-4xl font-bold text-bone">Approvals</h1>
      <p className="mt-2 text-bone-400">Review and publish submitted listings.</p>

      {error && <p className="mt-4 text-sm text-outbid">{error}</p>}

      {queue.length === 0 ? (
        <Card className="mt-8">
          <p className="text-sm text-bone-400">Nothing awaiting review.</p>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {queue.map((l) => (
            <Card key={l.id} className="flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-semibold text-bone">
                  {l.title ?? l.publicRef}
                </p>
                <p className="text-xs capitalize text-bone-500">
                  {l.category} · {l.saleMethod.replace(/_/g, ' ')} · {l.publicRef}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Chip>{l.status.replace(/_/g, ' ')}</Chip>
                {(l.status === 'submitted' || l.status === 'review') && (
                  <Button
                    variant="outline"
                    onClick={() => act(l.id, 'review')}
                    disabled={busy === l.id + 'review'}
                  >
                    Approve
                  </Button>
                )}
                {l.status === 'approved' && (
                  <Button
                    variant="gold"
                    onClick={() => act(l.id, 'publish')}
                    disabled={busy === l.id + 'publish'}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
