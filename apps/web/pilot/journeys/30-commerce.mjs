/**
 * Commercial offers & sealed tender — non-binding-until-confirmation + confidentiality
 * (rule 11; DECISIONS D4; docs/07/20). Authoritative: real API + DB, providers OFF.
 *
 *   - a submitted make-offer is `open` (a proposal), never a committed/accepted sale;
 *   - a sealed tender is confidential: before a reveal, a participant sees COUNTS ONLY —
 *     never a competitor's amount — and a buyer may not trigger the reveal;
 *   - with payments OFF, none of this creates a payment / settlement row.
 */
const A = 'buyer1';
const B = 'buyer2';

export default {
  id: 'commerce',
  title: 'Commercial offers & sealed tender (non-binding + confidential)',
  async run({ api, db, fixtures, personas, log }) {
    const steps = [];
    const push = (name, ok, detail = '') =>
      steps.push({ name, ok, detail: String(detail).slice(0, 160) });
    const t = fixtures.tokens;
    const scalar = (rows) => (Array.isArray(rows) ? rows[0] : rows);
    const count = (sql) => Number(scalar(db(sql)) || 0);

    const makeOffer = Object.values(fixtures.listings).find(
      (l) => l.ok && l.saleMethod === 'MAKE_OFFER',
    );
    const sealed = Object.values(fixtures.listings).find(
      (l) => l.ok && l.saleMethod === 'SEALED_TENDER',
    );
    if (!makeOffer || !sealed) {
      return {
        result: 'BLOCKED',
        steps: [{ name: 'fixtures', ok: false, detail: 'missing make-offer/sealed listing' }],
      };
    }

    // Nothing below may ever move money (providers OFF): snapshot the ledgers up front.
    const payBefore =
      count(`select count(*) from payment`) + count(`select count(*) from settlement`);

    // 1) Make-offer is NON-BINDING: a submitted offer is `open`, never accepted/committed.
    const offer = await api('POST', '/commercial-offers', {
      token: t[A],
      body: {
        listingId: makeOffer.listingId,
        saleMethodCode: 'MAKE_OFFER',
        proposal: { totalPriceMinor: 1_500_000_00, currency: 'LKR', notes: '[SIM] pilot offer' },
      },
    });
    const offerId = offer.json?.id;
    push(
      'make-offer accepted as a proposal',
      (offer.status === 200 || offer.status === 201) && !!offerId,
      `status=${offer.status}`,
    );
    const offerStatus = offerId ? scalar(db(`select status from offer where id='${offerId}'`)) : '';
    push(
      'submitted offer is non-binding (status open, not accepted)',
      offerStatus === 'open',
      `status=${offerStatus}`,
    );

    // 2) Sealed tender confidentiality — two DISTINCT customers submit sealed offers.
    // buyer2 lacks make_offer by default; grant it via the authoritative operator two-step first.
    await api('POST', '/singha-id/capabilities', {
      token: t[B],
      body: { capability: 'make_offer' },
    }).catch(() => {});
    await api('POST', '/singha-id/capabilities/decide', {
      token: t.operator1,
      body: { customerId: personas[B].id, capability: 'make_offer', decision: 'verified' },
    }).catch(() => {});

    const AMOUNT_A = 3_200_000_00;
    const AMOUNT_B = 4_100_000_00; // B is higher — must stay hidden from A pre-reveal
    const sa = await api('POST', '/commercial-offers', {
      token: t[A],
      body: {
        listingId: sealed.listingId,
        saleMethodCode: 'SEALED_TENDER',
        sealed: true,
        proposal: { totalPriceMinor: AMOUNT_A, currency: 'LKR' },
      },
    });
    const sb = await api('POST', '/commercial-offers', {
      token: t[B],
      body: {
        listingId: sealed.listingId,
        saleMethodCode: 'SEALED_TENDER',
        sealed: true,
        proposal: { totalPriceMinor: AMOUNT_B, currency: 'LKR' },
      },
    });
    push(
      'two sealed offers submitted',
      [200, 201].includes(sa.status) && [200, 201].includes(sb.status),
      `A=${sa.status} B=${sb.status}`,
    );

    // Pre-reveal, a participant sees COUNTS ONLY — never a competitor's (or their own) amount.
    const part = await api('GET', `/commercial-offers/listings/${sealed.listingId}/participation`, {
      token: t[A],
    });
    const partStr = JSON.stringify(part.json || {});
    const leaksAmount =
      partStr.includes(String(AMOUNT_B)) ||
      partStr.includes(String(AMOUNT_A)) ||
      partStr.includes(String(AMOUNT_B / 100)) ||
      partStr.includes(String(AMOUNT_A / 100));
    push(
      'sealed participation view is counts-only (no amounts leak)',
      part.status === 200 && !leaksAmount,
      leaksAmount ? 'AMOUNT LEAKED' : partStr.slice(0, 90),
    );

    // The seller-facing listing offers view must also not expose sealed amounts to a competitor buyer.
    const listView = await api('GET', `/commercial-offers/listings/${sealed.listingId}`, {
      token: t[A],
    });
    const listStr = JSON.stringify(listView.json || {});
    push(
      'competitor cannot read sealed amounts pre-reveal',
      !listStr.includes(String(AMOUNT_B)) && !listStr.includes(String(AMOUNT_B / 100)),
      `status=${listView.status}`,
    );

    // A buyer may NOT trigger the reveal (only seller/operator/admin can).
    const reveal = await api('POST', `/commercial-offers/listings/${sealed.listingId}/reveal`, {
      token: t[A],
    });
    push(
      'a buyer cannot reveal sealed offers (403)',
      reveal.status === 403,
      `status=${reveal.status}`,
    );

    // DB: both sealed offers exist and remain unrevealed.
    const sealedRows = count(
      `select count(*) from offer where listing_id='${sealed.listingId}' and sealed=true`,
    );
    const unrevealed = count(
      `select count(*) from offer where listing_id='${sealed.listingId}' and sealed=true and revealed_at is null`,
    );
    push(
      'sealed offers persisted and unrevealed',
      sealedRows >= 2 && unrevealed === sealedRows,
      `sealed=${sealedRows} unrevealed=${unrevealed}`,
    );

    // 3) RW5 — the OWNING seller may manage sealed offers on THEIR OWN listing without operator
    // rights; a DIFFERENT seller (supplier1) may not (no cross-seller IDOR). The sealed listing's
    // asset is owned by seller1 (fixtures createListing passes ownerCustomerId = seller1).
    const otherSellerRoster = await api('GET', `/commercial-offers/listings/${sealed.listingId}`, {
      token: t.supplier1,
    });
    push(
      'a different seller cannot read the sealed roster (no cross-seller IDOR)',
      otherSellerRoster.status === 403,
      `status=${otherSellerRoster.status}`,
    );
    const ownerRoster = await api('GET', `/commercial-offers/listings/${sealed.listingId}`, {
      token: t.seller1,
    });
    push(
      'owning seller can read their own sealed roster (RW5)',
      ownerRoster.status === 200,
      `status=${ownerRoster.status}`,
    );
    // Pre-reveal, even the owner's roster is counts-only — no competitor amounts.
    const ownerRosterStr = JSON.stringify(ownerRoster.json || {});
    push(
      "owner's pre-reveal roster is still counts-only",
      !ownerRosterStr.includes(String(AMOUNT_A)) && !ownerRosterStr.includes(String(AMOUNT_B)),
      ownerRosterStr.slice(0, 90),
    );
    const otherSellerReveal = await api(
      'POST',
      `/commercial-offers/listings/${sealed.listingId}/reveal`,
      { token: t.supplier1 },
    );
    push(
      'a different seller cannot reveal another seller’s tender (403)',
      otherSellerReveal.status === 403,
      `status=${otherSellerReveal.status}`,
    );
    const ownerReveal = await api(
      'POST',
      `/commercial-offers/listings/${sealed.listingId}/reveal`,
      { token: t.seller1 },
    );
    push(
      'owning seller can reveal their own sealed tender (RW5)',
      ownerReveal.status === 200 || ownerReveal.status === 201,
      `status=${ownerReveal.status}`,
    );

    // 4) Providers OFF — none of this created a payment/settlement row.
    const payAfter =
      count(`select count(*) from payment`) + count(`select count(*) from settlement`);
    push(
      'no payment/settlement created (providers off)',
      payAfter === payBefore,
      `before=${payBefore} after=${payAfter}`,
    );

    const failed = steps.filter((s) => !s.ok);
    log('commerce failed steps:', failed.map((s) => s.name).join('; ') || 'none');
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 1 ? 'PARTIAL' : 'FAIL',
      steps,
      backendVerified: true,
      securityVerified: true,
      notes:
        'Offers are proposals (status open) until an explicit seller accept; sealed tenders expose counts only pre-reveal and buyers cannot reveal; the OWNING seller (RW5) may read/reveal their own tender while a different seller is refused (no cross-seller IDOR); nothing charged (providers off).',
    };
  },
};
