'use client';

import { useEffect, useState } from 'react';
import { Button } from '@singha/ui';
import { addWatch, fetchMyWatch, removeWatch } from '../lib/api';

const TOKEN_KEY = 'singha_demo_token';

/**
 * Watch toggle backed by the AUTHORITATIVE server watchlist (/watch). Falls back
 * to a sign-in hint when there's no session. Replaces the old localStorage-only
 * behaviour (consolidated pack doc 06).
 */
export function WatchButton({ lotId }: { lotId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    setToken(t);
    if (t)
      fetchMyWatch(t)
        .then((rows) => setWatching(rows.some((r) => r.listingId === lotId)))
        .catch(() => undefined);
  }, [lotId]);

  async function toggle() {
    if (!token) {
      window.location.href = '/dashboard';
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
