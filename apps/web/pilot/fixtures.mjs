/**
 * Deterministic, clearly-synthetic fixtures for the pilot, all via the AUTHORITATIVE path
 * (no direct DB writes). Idempotent-ish: unique [SIM]/run-id refs; capability grants tolerate
 * an already-verified state. Returns a bundle the journeys consume.
 */
import { provisionTokens } from './lib/auth.mjs';
import { RUN_ID, SIM_PREFIX } from './config.mjs';

const m = (rupees) => Math.round(rupees * 100); // minor units (cents)

async function grantCap(api, opToken, personaToken, customerId, capability) {
  await api('POST', '/singha-id/capabilities', { token: personaToken, body: { capability } }).catch(
    () => {},
  );
  const dec = await api('POST', '/singha-id/capabilities/decide', {
    token: opToken,
    body: { customerId, capability, decision: 'verified' },
  });
  return dec.status === 200 || dec.status === 201;
}

async function createListing(
  api,
  { sellerToken, opToken, ownerId, category, attributes, saleMethod, title },
) {
  const asset = await api('POST', '/assets', {
    token: sellerToken,
    body: {
      category,
      attributes: { ...attributes, note: `${SIM_PREFIX} ${RUN_ID}` },
      ownerCustomerId: ownerId,
    },
  });
  const assetId = asset.json?.id;
  if (!assetId)
    return { ok: false, step: 'asset', detail: JSON.stringify(asset.json).slice(0, 160) };
  const publicRef =
    `SIM-${saleMethod.slice(0, 3)}-${RUN_ID.slice(-6)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const listing = await api('POST', '/listings', {
    token: sellerToken,
    body: { assetId, saleMethod, title: `${SIM_PREFIX} ${title}`, publicRef },
  });
  const listingId = listing.json?.id;
  if (!listingId)
    return { ok: false, step: 'listing', detail: JSON.stringify(listing.json).slice(0, 160) };
  await api('POST', `/listings/${listingId}/submit`, { token: sellerToken }).catch(() => {});
  const review = await api('POST', `/listings/${listingId}/review`, {
    token: opToken,
    body: { decision: 'approve' },
  });
  const publish = await api('POST', `/listings/${listingId}/publish`, { token: opToken });
  return {
    ok: true,
    listingId,
    assetId,
    publicRef,
    saleMethod,
    title,
    published: publish.status === 200 || publish.status === 201,
    reviewStatus: review.status,
  };
}

export async function ensureFixtures({ api, personas, log }) {
  // 1) persona tokens (email→token map for the stub + a key→token map for journeys)
  const authed = Object.values(personas).filter((p) => p.auth !== false);
  const provisioned = await provisionTokens(
    authed.map((p) => ({ email: p.email, customerId: p.id, roles: p.roles })),
  );
  const tokens = {};
  for (const p of authed) tokens[p.key] = provisioned.find((x) => x.email === p.email)?.token;
  const opToken = tokens.operator1;
  log('fixtures: tokens for', Object.keys(tokens).join(', '));

  // 2) grant capabilities via the authoritative two-step (buyer requests, operator decides)
  const grants = [];
  for (const p of authed) {
    for (const cap of p.caps || []) {
      const ok = await grantCap(api, opToken, tokens[p.key], p.id, cap);
      grants.push(`${p.key}:${cap}=${ok ? 'verified' : 'FAIL'}`);
    }
  }
  log('fixtures: capabilities', grants.join(' '));

  // 3) synthetic inventory across categories + sale methods (authoritative seller→publish)
  const seller = personas.seller1;
  const catalogue = [
    {
      category: 'vehicles',
      saleMethod: 'TIMED_AUCTION',
      title: '2018 Toyota Land Cruiser Prado',
      attributes: {
        make: 'Toyota',
        model: 'Land Cruiser Prado',
        year: 2018,
        condition: 'used',
        locationCity: 'Colombo',
      },
    },
    {
      category: 'machinery',
      saleMethod: 'TIMED_AUCTION',
      title: 'Komatsu PC200-8 Excavator',
      attributes: {
        make: 'Komatsu',
        model: 'PC200-8',
        hours: 6200,
        condition: 'used',
        locationCity: 'Gampaha',
      },
    },
    {
      category: 'gems',
      saleMethod: 'SEALED_TENDER',
      title: 'Ceylon Blue Sapphire · 4.2 ct',
      attributes: {
        type: 'blue sapphire',
        caratWeight: 4.2,
        colour: 'blue',
        origin: 'Ratnapura',
        certified: true,
      },
    },
    {
      category: 'property',
      saleMethod: 'MAKE_OFFER',
      title: 'Beachfront Land · 80 perches, Galle',
      attributes: {
        propertyType: 'land',
        extentPerches: 80,
        district: 'Galle',
        address: 'Coastal Rd, Galle',
      },
    },
    {
      category: 'bulk',
      saleMethod: 'BUY_NOW',
      title: 'Steel Scrap · 25 MT HMS 1&2',
      attributes: { itemType: 'HMS 1&2 steel scrap', quantity: 25, unit: 'MT' },
    },
  ];
  const listings = {};
  for (const c of catalogue) {
    const r = await createListing(api, {
      sellerToken: tokens.seller1,
      opToken,
      ownerId: seller.id,
      category: c.category,
      attributes: c.attributes,
      saleMethod: c.saleMethod,
      title: c.title,
    });
    listings[c.saleMethod + ':' + c.category] = r;
    log(
      'fixtures: listing',
      c.title,
      '→',
      r.ok ? `${r.publicRef} published=${r.published}` : `FAIL(${r.step})`,
    );
  }

  // 4) a deterministic auction (short window) for the auction-authority journey
  const aucListing = Object.values(listings).find((l) => l.ok && l.saleMethod === 'TIMED_AUCTION');
  let auction = null;
  if (aucListing) {
    const now = Date.now();
    const created = await api('POST', '/auctions', {
      token: opToken,
      body: {
        listingId: aucListing.listingId,
        startsAt: new Date(now - 1000).toISOString(),
        // 3-minute window: long enough that a full multi-journey run (incl. browser widths) stays
        // inside it, so bids in the auction-authority journey are never rejected as "ended".
        endsAt: new Date(now + 180000).toISOString(),
        currency: 'LKR',
        openingBidMinor: m(5_000_000),
        reserveMinor: m(9_000_000),
        reserveVisible: false,
        incrementMinor: m(100_000),
        softCloseTriggerSec: 10,
        softCloseExtendSec: 20,
      },
    });
    const auctionId = created.json?.id;
    if (auctionId) {
      await api('POST', `/auctions/${auctionId}/open`, { token: opToken }).catch(() => {});
      auction = {
        auctionId,
        listingId: aucListing.listingId,
        publicRef: aucListing.publicRef,
        openingMinor: m(5_000_000),
        reserveMinor: m(9_000_000),
        incrementMinor: m(100_000),
      };
    }
    log('fixtures: auction', auctionId || 'FAIL', JSON.stringify(created.json).slice(0, 80));
  }

  return {
    tokens,
    listings,
    auction,
    seededLots: { landCruiser: 'LOT-DEMO-1', komatsu: 'EVO-MAC-1', sapphire: 'EVO-GEM-1' },
  };
}
