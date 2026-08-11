'use client';

import { useEffect, useState } from 'react';
import { Button } from '@singha/ui';

const WATCH_KEY = 'singha_watchlist';

/** Add/remove a lot from the localStorage watchlist shown on the dashboard. */
export function WatchButton({ lotId }: { lotId: string }) {
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    const ids: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) ?? '[]');
    setWatching(ids.includes(lotId));
  }, [lotId]);

  function toggle() {
    const ids: string[] = JSON.parse(localStorage.getItem(WATCH_KEY) ?? '[]');
    const next = ids.includes(lotId) ? ids.filter((i) => i !== lotId) : [...ids, lotId];
    localStorage.setItem(WATCH_KEY, JSON.stringify(next));
    setWatching(next.includes(lotId));
  }

  return (
    <Button variant={watching ? 'gold' : 'outline'} onClick={toggle} className="w-full">
      {watching ? '★ Watching' : '☆ Watch this lot'}
    </Button>
  );
}
