/**
 * Logistics / Ports / Incoterms (Evolution E7 + E7b, pack doc 10). Authoritative: real API + DB,
 * `logisticsQuotes` OFF (the deterministic, credential-free quote engine still works fully offline).
 *
 *   - a quote is NOT a booking: it is a deterministic, float-free estimate (§10 / D5-D6) that
 *     persists its own assumptions + expiry, and books at most once;
 *   - booking snapshots the quote's terms onto a booking + creates a shipment (BOOKED) — a
 *     separate row, not a mutation of the quote;
 *   - only an operator may advance a shipment; an ILLEGAL skip (BOOKED straight to DELIVERED) is
 *     refused (409); the legal sequence PICKED_UP -> IN_TRANSIT -> ARRIVED -> DELIVERED is accepted;
 *   - the shipment timeline is APPEND-ONLY — every event persists, in order, in the DB.
 */
export default {
  id: 'logistics',
  title: 'Logistics quote -> booking -> shipment lifecycle (append-only, transition-guarded)',
  async run({ api, db, fixtures, log }) {
    const steps = [];
    const push = (name, ok, detail = '') =>
      steps.push({ name, ok, detail: String(detail).slice(0, 160) });
    const t = fixtures.tokens;
    const scalar = (rows) => (Array.isArray(rows) ? rows[0] : rows);
    const count = (sql) => Number(scalar(db(sql)) || 0);

    // 0) Real seeded nodes — Colombo (LK) -> Jebel Ali (AE), a genuine cross-border leg.
    const nodes = await api('GET', '/logistics/nodes');
    const codes = (nodes.json?.nodes ?? []).map((n) => n.code);
    push(
      'seeded logistics nodes are available (LKCMB, AEJEA)',
      codes.includes('LKCMB') && codes.includes('AEJEA'),
      `codes=${codes.join(',')}`,
    );

    const shipmentsBefore = count('select count(*) from logistics_shipment');

    // 1) A deterministic instant quote: SEA_FCL 500/unit x 20 x 250% cross-border = 25,000. Never a
    //    booking — it carries assumptions + an expiry window, and requires an authenticated participant.
    const anonQuote = await api('POST', '/logistics/quotes', {
      body: {
        originNodeCode: 'LKCMB',
        destinationNodeCode: 'AEJEA',
        transportMode: 'SEA_FCL',
        incoterm: 'FOB',
        chargeableUnits: 20,
        currency: 'USD',
      },
    });
    push(
      'anonymous cannot request a quote (401/403)',
      anonQuote.status === 401 || anonQuote.status === 403,
      `status=${anonQuote.status}`,
    );

    const quote = await api('POST', '/logistics/quotes', {
      token: t.buyer1,
      body: {
        originNodeCode: 'LKCMB',
        destinationNodeCode: 'AEJEA',
        transportMode: 'SEA_FCL',
        incoterm: 'FOB',
        chargeableUnits: 20,
        currency: 'USD',
      },
    });
    push(
      'deterministic quote: SEA_FCL x20 x250% cross-border = 25,000 (FOB -> buyer arranges)',
      quote.status === 201 &&
        quote.json?.amountMinor === 25_000 &&
        quote.json?.freightArranger === 'buyer' &&
        quote.json?.status === 'QUOTED' &&
        quote.json?.provider === 'fake',
      JSON.stringify(quote.json).slice(0, 160),
    );
    const quoteId = quote.json?.id;
    push(
      'a quote is not a booking — no shipment exists yet',
      !quote.json?.shipmentId &&
        !quote.json?.bookingId &&
        count('select count(*) from logistics_shipment') === shipmentsBefore,
      `shipmentId=${quote.json?.shipmentId} shipmentsUnchanged=${count('select count(*) from logistics_shipment') === shipmentsBefore}`,
    );

    // 2) Book the quote — creates a booking + shipment (BOOKED), snapshotting the quoted terms.
    const booked = await api('POST', `/logistics/quotes/${quoteId}/book`, { token: t.buyer1 });
    push(
      'booking creates a booking + shipment, snapshotting the quoted amount',
      booked.status === 201 &&
        booked.json?.status === 'BOOKED' &&
        typeof booked.json?.shipmentId === 'string' &&
        booked.json?.amountMinor === 25_000,
      JSON.stringify(booked.json).slice(0, 160),
    );
    const shipmentId = booked.json?.shipmentId;

    const rebook = await api('POST', `/logistics/quotes/${quoteId}/book`, { token: t.buyer1 });
    push(
      'quote <> booking: the same quote cannot be booked twice (409)',
      rebook.status === 409,
      `status=${rebook.status}`,
    );
    push(
      'exactly one shipment row was created by booking (not by quoting)',
      count('select count(*) from logistics_shipment') === shipmentsBefore + 1,
      `shipments=${count('select count(*) from logistics_shipment')}`,
    );

    const ship0 = await api('GET', `/logistics/shipments/${shipmentId}`, { token: t.buyer1 });
    push(
      'shipment starts BOOKED with a single timeline event',
      ship0.json?.status === 'BOOKED' && (ship0.json?.events ?? []).length === 1,
      `status=${ship0.json?.status} events=${ship0.json?.events?.length}`,
    );

    // 3) Only an operator may advance a shipment.
    const buyerAdvance = await api('POST', `/logistics/shipments/${shipmentId}/events`, {
      token: t.buyer1,
      body: { type: 'PICKUP', status: 'PICKED_UP' },
    });
    push(
      'a buyer cannot advance a shipment (403, operator-only)',
      buyerAdvance.status === 403,
      `status=${buyerAdvance.status}`,
    );

    // 4) An ILLEGAL skip straight to DELIVERED is refused by the lifecycle guard (409).
    const illegalSkip = await api('POST', `/logistics/shipments/${shipmentId}/events`, {
      token: t.operator1,
      body: { type: 'DELIVER', status: 'DELIVERED' },
    });
    push(
      'illegal skip BOOKED -> DELIVERED is rejected (409)',
      illegalSkip.status === 409,
      `status=${illegalSkip.status}`,
    );

    // 5) The legal sequence: PICKED_UP -> IN_TRANSIT -> ARRIVED -> DELIVERED.
    const pick = await api('POST', `/logistics/shipments/${shipmentId}/events`, {
      token: t.operator1,
      body: { type: 'PICKUP', status: 'PICKED_UP', locationCode: 'LKCMB' },
    });
    push(
      'operator advances shipment to PICKED_UP',
      pick.json?.status === 'PICKED_UP',
      `status=${pick.json?.status}`,
    );
    const transit = await api('POST', `/logistics/shipments/${shipmentId}/events`, {
      token: t.operator1,
      body: { type: 'DEPART', status: 'IN_TRANSIT' },
    });
    push(
      'operator advances shipment to IN_TRANSIT',
      transit.json?.status === 'IN_TRANSIT',
      `status=${transit.json?.status}`,
    );
    const arrived = await api('POST', `/logistics/shipments/${shipmentId}/events`, {
      token: t.operator1,
      body: { type: 'ARRIVE', status: 'ARRIVED', locationCode: 'AEJEA' },
    });
    push(
      'operator advances shipment to ARRIVED',
      arrived.json?.status === 'ARRIVED',
      `status=${arrived.json?.status}`,
    );
    const delivered = await api('POST', `/logistics/shipments/${shipmentId}/events`, {
      token: t.operator1,
      body: { type: 'DELIVER', status: 'DELIVERED' },
    });
    push(
      'operator advances shipment to DELIVERED',
      delivered.json?.status === 'DELIVERED',
      `status=${delivered.json?.status}`,
    );

    // 6) Append-only timeline — via the API and independently via the DB.
    const shipN = await api('GET', `/logistics/shipments/${shipmentId}`, { token: t.buyer1 });
    const apiTimeline = (shipN.json?.events ?? []).map((e) => e.status).join(',');
    push(
      'API timeline is append-only and complete (BOOKED..DELIVERED)',
      apiTimeline === 'BOOKED,PICKED_UP,IN_TRANSIT,ARRIVED,DELIVERED',
      `timeline=${apiTimeline}`,
    );
    const dbTimeline = db(
      `select status from logistics_shipment_event where shipment_id='${shipmentId}' order by occurred_at`,
    ).join(',');
    push(
      'DB timeline matches exactly — no event was skipped, dropped or reordered',
      dbTimeline === 'BOOKED,PICKED_UP,IN_TRANSIT,ARRIVED,DELIVERED',
      `dbTimeline=${dbTimeline}`,
    );

    // 7) The quote's committed terms persisted onto the booking untouched (a quote is not a booking).
    const bookingRow = scalar(
      db(`select amount_minor from logistics_booking where quote_id='${quoteId}'`),
    );
    const quoteRow = scalar(db(`select status from logistics_quote where id='${quoteId}'`));
    push(
      'DB: booking snapshots the quoted 25,000 exactly; the quote itself flips to accepted',
      Number(bookingRow) === 25_000 && quoteRow === 'ACCEPTED',
      `booking.amount_minor=${bookingRow} quote.status=${quoteRow}`,
    );

    const failed = steps.filter((s) => !s.ok);
    log('logistics failed steps:', failed.map((s) => s.name).join('; ') || 'none');
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 1 ? 'PARTIAL' : 'FAIL',
      steps,
      backendVerified: true,
      securityVerified: true,
      notes:
        'logisticsQuotes OFF; the deterministic fake provider still produces exact float-free estimates. A quote is a distinct, non-binding record from a booking (books at most once); only an operator can advance a shipment; an illegal BOOKED->DELIVERED skip is refused (409); the legal PICKED_UP->IN_TRANSIT->ARRIVED->DELIVERED sequence is accepted and the event timeline is append-only end to end (API + DB agree).',
    };
  },
};
