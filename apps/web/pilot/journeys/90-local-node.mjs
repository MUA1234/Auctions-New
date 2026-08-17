/**
 * Satellite Market Node (Evolution E13, Addendum A). Authoritative: real API + DB.
 *
 *   - a node resolves its mode/presets/capabilities; an unknown node is 404;
 *   - origination is operator-scoped (`exchange:operate`) and NEVER binds locally — it persists
 *     an attribution/audit snapshot, not a per-country ledger;
 *   - the listing a Local Commerce node originates is retrievable through `GET /nodes/:code/
 *     discovery` AND is the SAME canonical row in the central `GET /api/v2/catalogue` — one
 *     listing, two read paths, never a duplicate.
 */
export default {
  id: 'local-node',
  title:
    'Sri Lanka local node — operator origination, single canonical listing (no duplicate ledger)',
  async run({ api, apiV2, db, fixtures, personas, log }) {
    const steps = [];
    const push = (name, ok, detail = '') =>
      steps.push({ name, ok, detail: String(detail).slice(0, 160) });
    const t = fixtures.tokens;
    const scalar = (rows) => (Array.isArray(rows) ? rows[0] : rows);
    const NODE = 'lk-colombo';

    // 0) Resolve the real seeded Sri Lanka node (never hardcode a guessed code).
    const node = await api('GET', `/nodes/${NODE}`);
    push(
      'node resolves mode + presets (verified Local Commerce, LKR)',
      node.status === 200 &&
        node.json?.mode === 'LOCAL_COMMERCE' &&
        node.json?.presets?.currency === 'LKR',
      JSON.stringify(node.json).slice(0, 140),
    );
    push(
      'node capabilities report listings origination enabled',
      node.json?.capabilities?.originateListings === true,
      JSON.stringify(node.json?.capabilities),
    );
    const unknown = await api('GET', '/nodes/zz-does-not-exist');
    push('an unknown node code is 404', unknown.status === 404, `status=${unknown.status}`);

    // 1) Discovery reads the node's attributed inventory from the ONE central Listing table.
    const discovery = await api('GET', `/nodes/${NODE}/discovery`);
    const listings = discovery.json?.listings ?? [];
    push(
      'discovery serves central inventory attributed to this node',
      discovery.status === 200 && discovery.json?.source === 'central' && listings.length > 0,
      `source=${discovery.json?.source} count=${discovery.json?.count}`,
    );
    // A stable pre-existing demo lot if present, else whatever discovery actually returns —
    // either way it is a REAL row already attributed to this node, not one we invent.
    const target = listings.find((l) => l.publicRef === 'EVO-MAC-1') ?? listings[0];
    push(
      'a concrete node-attributed listing is available to trace',
      !!target?.id && !!target?.publicRef,
      JSON.stringify(target),
    );

    // 2) Origination is operator-scoped — a plain customer is refused.
    const buyerOrig = await api('POST', `/nodes/${NODE}/originate`, {
      token: t.buyer1,
      body: { capability: 'listings', subjectRef: target?.publicRef },
    });
    push(
      'a non-operator cannot originate through the node (403)',
      buyerOrig.status === 403,
      `status=${buyerOrig.status}`,
    );

    // 3) The operator originates (attribution only — never a local bind) for that concrete listing.
    const originate = await api('POST', `/nodes/${NODE}/originate`, {
      token: t.operator1,
      body: { capability: 'listings', subjectRef: target?.publicRef },
    });
    push(
      'verified, enabled node ALLOWS operator origination (attribution)',
      (originate.status === 200 || originate.status === 201) &&
        originate.json?.outcome === 'ALLOWED' &&
        originate.json?.originNode === NODE,
      JSON.stringify(originate.json).slice(0, 140),
    );

    // 4) DB: the origination is an audit/attribution row, not a second ledger entry.
    const auditRow = scalar(
      db(
        `select outcome||'|'||subject_ref||'|'||requested_by from node_origination where node_code='${NODE}' and subject_ref='${target?.publicRef}' order by created_at desc limit 1`,
      ),
    );
    push(
      'DB: origination audit persisted (outcome + subject + requesting operator)',
      auditRow === `ALLOWED|${target?.publicRef}|${personas.operator1.id}`,
      `row=${auditRow}`,
    );

    // 5) THE central catalogue and node discovery show the SAME canonical row — no duplicate ledger.
    const catId = target?.id;
    const bySearch = await apiV2(
      'GET',
      `/catalogue?search=${encodeURIComponent(target?.publicRef ?? '')}`,
    );
    const foundBySearch = (bySearch.json?.items ?? []).find(
      (i) => i.reference === target?.publicRef,
    );
    push(
      'the SAME listing is discoverable through the central catalogue search',
      bySearch.status === 200 && foundBySearch?.id === catId,
      `searchId=${foundBySearch?.id} discoveryId=${catId}`,
    );
    const byId = await apiV2('GET', `/catalogue/${catId}`);
    push(
      'the SAME listing resolves directly by id in the central catalogue',
      byId.status === 200 && byId.json?.reference === target?.publicRef,
      `status=${byId.status} reference=${byId.json?.reference}`,
    );

    // 6) DB: exactly ONE listing row for this publicRef — no per-country duplicate.
    const rowCount = Number(
      scalar(db(`select count(*) from listing where public_ref='${target?.publicRef}'`)) || 0,
    );
    push(
      'DB: exactly one listing row exists for this reference (no duplicate ledger)',
      rowCount === 1,
      `rows=${rowCount}`,
    );

    const failed = steps.filter((s) => !s.ok);
    log('local-node failed steps:', failed.map((s) => s.name).join('; ') || 'none');
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 1 ? 'PARTIAL' : 'FAIL',
      steps,
      backendVerified: true,
      securityVerified: true,
      notes:
        'Origination is operator-scoped and gated by node mode/capability/verification; it persists an attribution/audit row, never a second ledger. The node-attributed listing resolves identically (same id + reference) through GET /nodes/:code/discovery and the central GET /api/v2/catalogue (both by search and by id), and the DB confirms exactly one listing row — proving there is one central canonical record, not a per-country copy.',
    };
  },
};
