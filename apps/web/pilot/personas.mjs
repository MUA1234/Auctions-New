/**
 * Synthetic personas for the pilot. Emails are tagged with the run id so the data is
 * unmistakably a simulation and separable per run. `customerId` is resolved at fixture
 * time (created/looked-up via the authoritative path); roles are the principal roles the
 * dev-token endpoint mints. Capabilities (bidder/offer/seller/export) are GRANTED through
 * the authoritative operator path in fixtures.mjs, never assumed.
 */
import { RUN_ID } from './config.mjs';

const email = (slug) => `sim.${slug}.${RUN_ID.toLowerCase()}@sim.singha.test`;

// Synthetic, clearly-identifiable pilot logins bound to pre-existing NON-PRODUCTION demo
// customer identities (evo-*/demo-* seed data). Created data (listings/offers/auctions) is
// additionally tagged [SIM]. `id` = the authoritative customer id the persona acts as.
export const PERSONAS = {
  anon: { key: 'anon', label: 'Anonymous visitor', roles: [], auth: false },

  buyer1: {
    key: 'buyer1',
    label: 'Registered buyer / bidder A',
    email: email('buyer1'),
    id: '01M04151GZ7YXRZ5ZYYQ64ME0D',
    roles: ['customer'],
    caps: ['place_bid', 'make_offer'],
  },
  buyer2: {
    key: 'buyer2',
    label: 'Bidder B',
    email: email('buyer2'),
    id: '01M04151H253TPFNVQ9R3JTATK',
    roles: ['customer'],
    caps: ['place_bid'],
  },
  buyer3: {
    key: 'buyer3',
    label: 'Bidder C',
    email: email('buyer3'),
    id: '01M04151H4VYGHZC7CJZA12T9Q',
    roles: ['customer'],
    caps: ['place_bid'],
  },

  seller1: {
    key: 'seller1',
    label: 'Seller',
    email: email('seller1'),
    id: '01M04150NW8H3N5SKFSGGJF4HV',
    roles: ['customer', 'seller'],
    caps: ['sell'],
  },

  procurement1: {
    key: 'procurement1',
    label: 'Procurement buyer',
    email: email('proc1'),
    id: '01M04151GZ7YXRZ5ZYYQ64ME0D',
    roles: ['customer'],
    caps: ['make_offer'],
  },
  supplier1: {
    key: 'supplier1',
    label: 'Supplier',
    email: email('supplier1'),
    id: '01M04151H67SC7CKAH4GSSY45G',
    roles: ['customer', 'seller'],
    caps: ['sell'],
  },

  local1: {
    key: 'local1',
    label: 'Sri Lanka local-market customer',
    email: email('local1'),
    id: '01M04151H4VYGHZC7CJZA12T9Q',
    roles: ['customer'],
    caps: ['place_bid'],
  },

  operator1: {
    key: 'operator1',
    label: 'Staff / operator',
    email: email('operator'),
    id: '01M02VX6TQSE10F2YKEW8DXR68',
    roles: ['auction_staff'],
    caps: [],
  },
};

export const AUTHED = Object.values(PERSONAS).filter((p) => p.auth !== false);
