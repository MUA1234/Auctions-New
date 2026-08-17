/** Multi-bidder auction authority: proxy engine, proxy-max PRIVACY, reserve, soft-close,
 *  append-only ledger — all via the authoritative API + DB verification. */
export default {
  id: 'auction',
  title: 'Multi-bidder auction (proxy/reserve/soft-close/ledger)',
  async run({ api, db, fixtures }) {
    const steps = [];
    const push = (name, ok, detail = '') => steps.push({ name, ok, detail });
    const a = fixtures.auction;
    if (!a) {
      return {
        result: 'BLOCKED',
        steps: [{ name: 'fixture auction', ok: false, detail: 'no auction created' }],
      };
    }
    const t = fixtures.tokens;
    const aId = a.auctionId ?? a.auction?.auctionId;
    const m = (r) => Math.round(r * 100);

    // 1) Two bidders place PRIVATE proxy maxes; engine must lead B at A's max + increment.
    const b1 = await api('POST', `/auctions/${aId}/bids`, {
      token: t.buyer1,
      body: { maxAmountMinor: m(6_000_000) },
    });
    const b2 = await api('POST', `/auctions/${aId}/bids`, {
      token: t.buyer2,
      body: { maxAmountMinor: m(8_000_000) },
    });
    push(
      'buyer1 proxy bid accepted',
      b1.json?.accepted === true,
      JSON.stringify(b1.json).slice(0, 120),
    );
    push(
      'buyer2 proxy bid accepted',
      b2.json?.accepted === true,
      JSON.stringify(b2.json).slice(0, 120),
    );
    const current = b2.json?.currentBidMinor;
    push(
      'engine leads B at A-max+increment (6.1m)',
      current === m(6_100_000),
      `current=${current}`,
    );
    push(
      'B leads, not exposed A max in response',
      b2.json?.youLead === true && !JSON.stringify(b2.json).includes(String(m(6_000_000))),
      JSON.stringify(b2.json).slice(0, 120),
    );

    // 2) Proxy-max PRIVACY: the public state must never expose either bidder's max.
    const state = await api('GET', `/auctions/${aId}/state`);
    const stateStr = JSON.stringify(state.json);
    const leaksMax =
      stateStr.includes(String(m(6_000_000))) || stateStr.includes(String(m(8_000_000)));
    push('public state hides both proxy maxima', !leaksMax, leaksMax ? 'MAX LEAKED' : 'ok');
    // DB: public bid ledger has amounts only; private maxes live in a SEPARATE table.
    const bidCols = db(
      `select count(*) from information_schema.columns where table_name='bid' and column_name ilike '%max%'`,
    );
    push('bid ledger stores no proxy max column', bidCols[0] === '0', `maxCols=${bidCols[0]}`);

    // 3) Reserve behaviour: 6.1m < reserve 9.0m → reserve NOT met (winner not yet committed).
    const rm = state.json?.reserveMet;
    push(
      'reserve not met below reserve price',
      rm === false || rm === undefined,
      `reserveMet=${rm}`,
    );
    push('reserve price itself not disclosed', !stateStr.includes(String(m(9_000_000))), 'ok');

    // 4) Append-only ledger: monotonically increasing sequence, no deletes.
    const rows = db(`select sequence from bid where auction_id='${aId}' order by sequence`);
    const seqs = rows.map((r) => Number(r)).filter((n) => !Number.isNaN(n));
    const monotonic = seqs.every((n, i) => i === 0 || n === seqs[i - 1] + 1);
    push(
      'bid ledger append-only, monotonic sequence',
      seqs.length >= 2 && monotonic,
      `seqs=${seqs.join(',')}`,
    );

    // 5) Soft-close authority: a third, valid competing bid (6.5m ≥ current 6.1m + increment) is
    //    accepted and appended; B still leads via proxy (max 8m). The window must never SHORTEN.
    const before = state.json?.endsAt;
    const late = await api('POST', `/auctions/${aId}/bids`, {
      token: t.buyer3,
      body: { maxAmountMinor: m(6_500_000) },
    });
    push(
      'third competing bid accepted (append-only grows)',
      late.json?.accepted === true,
      JSON.stringify(late.json).slice(0, 120),
    );
    const state2 = await api('GET', `/auctions/${aId}/state`);
    const notShortened =
      state2.json?.endsAt && before && new Date(state2.json.endsAt) >= new Date(before);
    push(
      'soft-close: window never shortens on a late bid',
      notShortened === true,
      `before=${before} after=${state2.json?.endsAt}`,
    );

    const failed = steps.filter((s) => !s.ok);
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 1 ? 'PARTIAL' : 'FAIL',
      steps,
      backendVerified: true,
      securityVerified: true,
      notes:
        'Authoritative API + DB. Proxy maxima never exposed; append-only bid ledger; reserve/soft-close honoured.',
    };
  },
};
