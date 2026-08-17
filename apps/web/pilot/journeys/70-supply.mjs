/**
 * Supply Programmes + perishable goods (Evolution E10, pack doc 09 §Supply Programme + owner reqs
 * 23/24; DECISIONS D4). Authoritative: real API + DB, providers OFF.
 *
 *   - a supplier posts a recurring/perishable supply programme (red onions: quantity, unit,
 *     cadence, min/max order) instead of re-listing every cycle;
 *   - a buyer's `POST /supply/recommend` match is a RANKED RECOMMENDATION only — it awards
 *     nothing, ranks cheapest-first, and excludes an over-minimum programme from the results;
 *   - perishable metadata attaches to the programme and drives automatic expiry;
 *   - the programme lifecycle is transition-guarded: only the owner may move it, and an invalid
 *     transition (terminal `withdrawn` → `active`) is refused.
 */
import { SIM_PREFIX } from '../config.mjs';

const onion = (over) => ({
  product: `${SIM_PREFIX} Red Onion`,
  category: 'produce',
  originCountry: 'LK',
  quantityUnitCode: 'MT',
  availableQuantity: '50',
  minOrderQuantity: '5',
  maxOrderQuantity: '50',
  frequency: 'weekly',
  pricingBasis: 'per_unit',
  currency: 'LKR',
  leadTimeDays: 3,
  ...over,
});

export default {
  id: 'supply',
  title: 'Supply programme (recurring + perishable) — recommend-only matching, lifecycle guard',
  async run({ api, db, fixtures, personas, log }) {
    const steps = [];
    const push = (name, ok, detail = '') =>
      steps.push({ name, ok, detail: String(detail).slice(0, 160) });
    const t = fixtures.tokens;
    const scalar = (rows) => (Array.isArray(rows) ? rows[0] : rows);

    // 1) Supplier posts THREE standing-availability programmes (draft): a cheap one, a dearer one
    //    that still matches, and one whose minimum order is too high to ever match this buyer.
    const cheap = await api('POST', '/supply/programmes', {
      token: t.supplier1,
      body: onion({ indicativePriceMinor: 45_000 }),
    });
    const dear = await api('POST', '/supply/programmes', {
      token: t.supplier1,
      body: onion({ indicativePriceMinor: 60_000 }),
    });
    const bigMin = await api('POST', '/supply/programmes', {
      token: t.supplier1,
      body: onion({ indicativePriceMinor: 1, minOrderQuantity: '1000', maxOrderQuantity: '2000' }),
    });
    push(
      'supplier posts three recurring programmes (draft)',
      [cheap, dear, bigMin].every((r) => r.status === 201 && r.json?.status === 'draft'),
      `cheap=${cheap.status} dear=${dear.status} bigMin=${bigMin.status}`,
    );

    // 2) min > max order quantity is refused (422) — a basic quantity-range invariant.
    const badRange = await api('POST', '/supply/programmes', {
      token: t.supplier1,
      body: onion({ minOrderQuantity: '100', maxOrderQuantity: '10' }),
    });
    push(
      'min > max order quantity is refused (422)',
      badRange.status === 422,
      `status=${badRange.status}`,
    );

    // 3) Activate the three live programmes (draft -> active).
    const activate = (id) =>
      api('POST', `/supply/programmes/${id}/status`, {
        token: t.supplier1,
        body: { status: 'active' },
      });
    const a1 = await activate(cheap.json.id);
    const a2 = await activate(dear.json.id);
    const a3 = await activate(bigMin.json.id);
    push(
      'programmes activate (draft -> active)',
      [a1, a2, a3].every((r) => r.json?.status === 'active'),
      `a1=${a1.json?.status} a2=${a2.json?.status} a3=${a3.json?.status}`,
    );

    // 4) Buyer matching: cheapest-first RECOMMENDATION only — excludes the over-minimum programme.
    const recs = await api('POST', '/supply/recommend', {
      token: t.buyer1,
      body: { category: 'produce', product: 'onion', quantityRequired: '10', originCountry: 'LK' },
    });
    const recIds = (recs.json?.recommendations ?? []).map((r) => r.programmeId);
    push(
      'recommendation is advisory only (binding:false)',
      (recs.status === 200 || recs.status === 201) && recs.json?.binding === false,
      `status=${recs.status} binding=${recs.json?.binding}`,
    );
    push(
      'matching includes in-range offerable programmes, excludes the over-minimum one',
      recIds.includes(cheap.json.id) &&
        recIds.includes(dear.json.id) &&
        !recIds.includes(bigMin.json.id),
      `ids=${recIds.join(',')}`,
    );
    push(
      'matches rank cheapest indicative price first',
      recIds.indexOf(cheap.json.id) >= 0 &&
        recIds.indexOf(dear.json.id) >= 0 &&
        recIds.indexOf(cheap.json.id) < recIds.indexOf(dear.json.id),
      `order=${recIds.join(',')}`,
    );

    // 5) Perishable metadata attaches to the live programme and drives automatic expiry.
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const attach = await api('POST', '/supply/perishable', {
      token: t.supplier1,
      body: {
        subjectType: 'supply_programme',
        subjectId: cheap.json.id,
        metadata: {
          harvestDate: new Date(Date.now() - 2 * 86_400_000).toISOString(),
          packingDate: new Date(Date.now() - 1 * 86_400_000).toISOString(),
          expiryDate: future,
          variety: 'Bombay red',
          grade: 'A',
          coldChain: true,
          tempMinC: '2',
          tempMaxC: '8',
        },
      },
    });
    push(
      'perishable metadata attaches to the programme',
      attach.status === 201,
      `status=${attach.status}`,
    );
    const view = await api('GET', `/supply/perishable/supply_programme/${cheap.json.id}`, {
      token: t.supplier1,
    });
    push(
      'future best-use date -> not expired; cold-chain echoed',
      view.json?.expired === false && view.json?.coldChain === true,
      JSON.stringify(view.json).slice(0, 120),
    );

    // 6) Only the owner manages the programme (cross-tenant authorization).
    const strangerSet = await api('POST', `/supply/programmes/${dear.json.id}/status`, {
      token: t.buyer1,
      body: { status: 'paused' },
    });
    push(
      'a non-owner cannot manage a programme (403)',
      strangerSet.status === 403,
      `status=${strangerSet.status}`,
    );

    // 7) Lifecycle guard: active -> withdrawn is legal (and terminal); withdrawn -> active is not.
    const withdraw = await api('POST', `/supply/programmes/${cheap.json.id}/status`, {
      token: t.supplier1,
      body: { status: 'withdrawn' },
    });
    push(
      'owner withdraws the programme (active -> withdrawn)',
      withdraw.json?.status === 'withdrawn',
      `status=${withdraw.json?.status}`,
    );
    const revive = await api('POST', `/supply/programmes/${cheap.json.id}/status`, {
      token: t.supplier1,
      body: { status: 'active' },
    });
    push(
      'invalid transition withdrawn -> active is refused (409)',
      revive.status === 409,
      `status=${revive.status}`,
    );

    // 8) DB: persistence — the terminal state sticks, and each programme belongs to its supplier.
    const finalStatus = scalar(
      db(`select status from supply_programme where id='${cheap.json.id}'`),
    );
    push(
      'DB: withdrawn programme persists as terminal (not silently revived)',
      finalStatus === 'withdrawn',
      finalStatus,
    );
    const ids = `'${cheap.json.id}','${dear.json.id}','${bigMin.json.id}'`;
    const ownerCount = Number(
      scalar(
        db(
          `select count(*) from supply_programme where id in (${ids}) and supplier_customer_id='${personas.supplier1.id}'`,
        ),
      ) || 0,
    );
    push(
      'DB: all three programmes persisted, correctly owned by the posting supplier',
      ownerCount === 3,
      `ownedByPoster=${ownerCount}`,
    );

    const failed = steps.filter((s) => !s.ok);
    log('supply failed steps:', failed.map((s) => s.name).join('; ') || 'none');
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 1 ? 'PARTIAL' : 'FAIL',
      steps,
      backendVerified: true,
      securityVerified: true,
      notes:
        'A supplier posts recurring red-onion availability (quantity/unit/cadence/min-max order) instead of re-listing; buyer matching ranks cheapest-first but binds nothing and correctly excludes an over-minimum programme; perishable metadata drives automatic expiry; only the owner manages the programme and the terminal withdrawn state cannot be revived (409).',
    };
  },
};
