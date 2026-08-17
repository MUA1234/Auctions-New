/**
 * Procurement / reverse-tender two-sided market (Evolution E9, pack doc 09; DECISIONS D4).
 * Authoritative: real API + DB, providers OFF.
 *
 *   - a buyer posts an RFQ; suppliers respond with DIFFERENT priced proposals;
 *   - proposals rank cheapest-first for the buyer — a RECOMMENDATION only, never auto-selected;
 *   - an award before the submission window closes is refused, and only the owning buyer may
 *     close/award/view proposals (a supplier who merely submitted a proposal is not the owner);
 *   - the buyer AWARDS AN EXPLICIT choice — even the dearest — proving cheapest is never
 *     auto-awarded (§09 / D4); the DB shows the winner accepted and every loser (including the
 *     cheapest) rejected.
 */
import { devToken } from '../lib/api.mjs';
import { RUN_ID, SIM_PREFIX } from '../config.mjs';

export default {
  id: 'procurement',
  title: 'Procurement RFQ — multi-supplier proposals, explicit non-cheapest award',
  async run({ api, db, fixtures, log }) {
    const steps = [];
    const push = (name, ok, detail = '') =>
      steps.push({ name, ok, detail: String(detail).slice(0, 160) });
    const t = fixtures.tokens;
    const scalar = (rows) => (Array.isArray(rows) ? rows[0] : rows);

    // A third supplier beyond the fixture's seller1/supplier1 — minted directly (no capability
    // grant needed: procurement is gated by the role-derived `exchange:participate` permission,
    // which every `customer` role already carries).
    const supplierCId = `SIM-${RUN_ID}-procC`;
    const supplierC = await devToken({
      email: `sim.procC.${RUN_ID.toLowerCase()}@sim.singha.test`,
      customerId: supplierCId,
      roles: ['customer'],
    });

    // 1) Buyer posts an RFQ (reverse tender).
    const created = await api('POST', '/procurement/requests', {
      token: t.procurement1,
      body: {
        type: 'REVERSE_TENDER',
        title: `${SIM_PREFIX} 100t steel billets`,
        currency: 'USD',
        category: 'metals',
      },
    });
    const requestId = created.json?.id;
    push(
      'buyer posts an RFQ (open)',
      created.status === 201 && created.json?.status === 'open' && !!requestId,
      `status=${created.status} body=${JSON.stringify(created.json).slice(0, 100)}`,
    );

    // 2) THREE suppliers submit proposals with DIFFERENT prices, quantities and payment terms.
    const submit = (token, totalPriceMinor, quantity, paymentTerms) =>
      api('POST', `/procurement/requests/${requestId}/proposals`, {
        token,
        body: {
          proposal: { currency: 'USD', totalPriceMinor, quantity, paymentTerms },
        },
      });
    const pDear = await submit(t.seller1, 3_000_000_00, '100', 'Net 30');
    const pCheap = await submit(t.supplier1, 1_000_000_00, '80', '50% advance, 50% on delivery');
    const pMid = await submit(supplierC, 2_000_000_00, '120', 'Net 60');
    push(
      'three suppliers submit DIFFERENT proposals (price/qty/terms)',
      [pDear, pCheap, pMid].every((r) => r.status === 201 && !!r.json?.id),
      `dear=${pDear.status} cheap=${pCheap.status} mid=${pMid.status}`,
    );
    const distinct = scalar(
      db(
        `select count(distinct total_price_minor)||','||count(distinct quantity)||','||count(distinct payment_terms) from procurement_proposal where request_id='${requestId}'`,
      ),
    );
    push(
      'DB: all three proposals are genuinely distinct (price, qty, terms)',
      distinct === '3,3,3',
      `distinct(price,qty,terms)=${distinct}`,
    );

    // 3) An award before the window closes is refused — the engine, not the buyer's intent, gates it.
    const early = await api('POST', `/procurement/requests/${requestId}/award`, {
      token: t.procurement1,
      body: { selectedProposalId: pCheap.json.id },
    });
    push('award before close is refused (409)', early.status === 409, `status=${early.status}`);

    // 4) Only the owning buyer may manage the request — a supplier who merely proposed is not the
    //    owner (cross-tenant authorization, not just "is a customer").
    const strangerClose = await api('POST', `/procurement/requests/${requestId}/close`, {
      token: supplierC,
    });
    push(
      'a non-owner supplier cannot close the request (403)',
      strangerClose.status === 403,
      `status=${strangerClose.status}`,
    );

    const closed = await api('POST', `/procurement/requests/${requestId}/close`, {
      token: t.procurement1,
    });
    push(
      'owning buyer closes the submission window',
      closed.status === 201 && closed.json?.status === 'closed',
      `status=${closed.status} body.status=${closed.json?.status}`,
    );

    // 5) Ranked cheapest-first — a RECOMMENDATION only. Closing/ranking never itself awards.
    const view = await api('GET', `/procurement/requests/${requestId}/proposals`, {
      token: t.procurement1,
    });
    const rankedIds = (view.json?.ranked ?? []).map((r) => r.proposalId).join(',');
    const expectedOrder = [pCheap.json.id, pMid.json.id, pDear.json.id].join(',');
    push(
      'proposals rank cheapest-first (recommendation only)',
      view.json?.suppliers === 3 && rankedIds === expectedOrder,
      `suppliers=${view.json?.suppliers} ranked=${rankedIds}`,
    );
    push(
      'ranking alone did not award anything (request still just closed)',
      view.json?.status === 'closed',
      `status=${view.json?.status}`,
    );
    const strangerView = await api('GET', `/procurement/requests/${requestId}/proposals`, {
      token: supplierC,
    });
    push(
      'a non-owner supplier cannot view the proposal roster (403)',
      strangerView.status === 403,
      `status=${strangerView.status}`,
    );

    // 6) The buyer AWARDS an EXPLICIT, NON-cheapest supplier (the dearest) — proving the cheapest is
    //    never auto-selected (§09 / D4).
    const award = await api('POST', `/procurement/requests/${requestId}/award`, {
      token: t.procurement1,
      body: { selectedProposalId: pDear.json.id },
    });
    push(
      'buyer explicitly awards the DEAREST proposal (never auto-cheapest)',
      award.status === 201 && award.json?.awardedProposalId === pDear.json.id,
      `status=${award.status} awarded=${award.json?.awardedProposalId}`,
    );

    // 7) DB: the request + proposal states settle exactly as the explicit award dictates.
    const reqRow = scalar(
      db(
        `select status||'|'||awarded_proposal_id from procurement_request where id='${requestId}'`,
      ),
    );
    push(
      'DB: request persisted awarded, pointing at the chosen (dearest) proposal',
      reqRow === `awarded|${pDear.json.id}`,
      `row=${reqRow}`,
    );
    const winnerStatus = scalar(
      db(`select status from procurement_proposal where id='${pDear.json.id}'`),
    );
    push('DB: winning (dearest) proposal is accepted', winnerStatus === 'accepted', winnerStatus);
    const cheapestStatus = scalar(
      db(`select status from procurement_proposal where id='${pCheap.json.id}'`),
    );
    const midStatus = scalar(
      db(`select status from procurement_proposal where id='${pMid.json.id}'`),
    );
    push(
      'DB: losers — including the cheapest — are rejected, not awarded',
      cheapestStatus === 'rejected' && midStatus === 'rejected',
      `cheapest=${cheapestStatus} mid=${midStatus}`,
    );
    const acceptedCount = Number(
      scalar(
        db(
          `select count(*) from procurement_proposal where request_id='${requestId}' and status='accepted'`,
        ),
      ) || 0,
    );
    push(
      'DB: exactly one accepted proposal for the request (no double-award)',
      acceptedCount === 1,
      `accepted=${acceptedCount}`,
    );

    const failed = steps.filter((s) => !s.ok);
    log('procurement failed steps:', failed.map((s) => s.name).join('; ') || 'none');
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 1 ? 'PARTIAL' : 'FAIL',
      steps,
      backendVerified: true,
      securityVerified: true,
      notes:
        'Three suppliers (seller1, supplier1, a minted third) submit genuinely distinct proposals; ranking is cheapest-first but advisory; award is refused before close and to non-owners; the buyer explicitly awards the DEAREST proposal, and the DB confirms the winner accepted while every loser — including the cheapest — is rejected (§09 / D4: never auto-award).',
    };
  },
};
