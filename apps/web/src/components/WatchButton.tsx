'use client';

import { useEffect, useState } from 'react';
import { Button } from '@singha/ui';
import { addWatch, fetchMyWatch, removeWatch } from '../lib/api';
import { useAuth } from '../lib/auth';

/**
 * Watch toggle backed by the AUTHORITATIVE server watchlist (/watch). Falls back
 * to a sign-in hint when there's no session. Replaces the old localStorage-only
 * behaviour (consolidated pack doc 06).
 */
export function WatchButton({ lotId }: { lotId: string }) {
  const { token } = useAuth();
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token)
      fetchMyWatch(token)
        .then((rows) => setWatching(rows.some((r) => r.listingId === lotId)))
        .catch(() => undefined);
  }, [lotId, token]);

  async function toggle() {
    if (!token) {
      window.location.href = `/login?next=/lot/${lotId}`;
      return;
    }
    setBusy(true);
    try {
      if (watching) {
        await removeWatch(lotId, token);
        setWatching(false);
      } else {
        await addWatch(lotId, token);
        setWatching(true);
      }
    } catch {
      /* surfaced by the disabled state resetting */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={watching ? 'gold' : 'outline'}
      onClick={toggle}
      disabled={busy}
      className="w-full"
    >
      {watching ? '★ Watching' : '☆ Watch this lot'}
    </Button>
  );
}
