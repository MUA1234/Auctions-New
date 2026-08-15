# SINGHA — CUSTOMER-FACING LANGUAGE GLOSSARY (E1)

The house rules for product copy (pack docs 04 / 11 / 36). Singha is **international by
architecture, not by label** — the inventory communicates reach; the copy does not shout
"Global". "Auction" names a real auction mechanic, never the platform. A guard test
(`apps/web/src/lib/language-glossary.test.ts`) fails the build if a banned phrase reappears in
customer-facing source.

## Prefer
| Use | For |
|---|---|
| **Singha** | The master brand and platform, everywhere the identity appears. |
| **Singha Exchange** | The commercial marketplace descriptor, where it adds clarity. |
| **assets & commodities** | What is traded (not "auction items"). |
| **Offer · Make Offer · Submit Offer** | Negotiated / private / sealed proposals. |
| **Buy Now** | Fixed-price immediate purchase. |
| **Tender · Sealed offer** | Confidential competitive proposals. |
| **Timed Auction · Live Auction** | Genuine auction mechanics only. |
| **Wanted · Request Supply · RFQ** | Buyer-initiated sourcing (demand side). |
| **Explore / Exchange / Sell / Wanted / Services** | Geography-neutral primary IA. |
| **server-authoritative records** | The trust story (not "bidding" as a catch-all). |

## Avoid (banned in customer-facing source — enforced by test)
| Avoid | Because | Say instead |
|---|---|---|
| Global Marketplace | International by architecture, not by label. | Singha / Singha Exchange |
| Singha Global | Master brand is "Singha", no "Global" suffix. | Singha |
| Global Auction | Auction is one method, not the platform. | Singha Exchange |
| Auction Account / Shipping / Catalogue / Offer | "Auction" only for real auction mechanics. | Account / Shipping / Catalogue / Offer |
| Worldwide | Geography-neutral tone. | (omit; let inventory show reach) |
| "Sri Lanka's …" as the brand frame | Not a single-country marketplace. | "The trusted exchange for …" |

Not banned: the bare word **auction** (correct for real auctions), the legal/registered name
**Singha Auctions** in genuinely legal contexts (invoices, contracts — surfaced in E6 once the
owner confirms the entity), and dev-only code comments (e.g. "Global 404 boundary").

## Changed in E1 (customer-facing copy, un-gated — production-safe)
- Global metadata (`layout.tsx`): title/description/template → "Singha", assets **and
  commodities**, no "world-class", no geography lock.
- Home (`page.tsx`): H1 "Sri Lanka's trusted asset exchange" → "The trusted exchange for assets
  & commodities"; eyebrow → "Offers · buy now · tenders · live auctions"; sub-copy broadened to
  produce/commodities and multi-method; "Server-authoritative bidding" → "…records".
- Footer: brand line de-geographied; "© Singha Auctions" → "© Singha"; heading "Marketplace" →
  "Explore"; tagline → "Offers · buy now · tenders · auctions".
- Logo alt, header/drawer aria: "Singha Auctions" → "Singha" (+ `BrandLogo.test` updated).
- `how-it-works`, `terms`, `account`, `live`: brand/titles → "Singha"; how-it-works reframed as
  an exchange for assets & commodities (auction language kept only where the sale is an auction).

## Deferred (later phases)
- Legal entity name(s) on invoices/contracts/transaction terms — **owner-gated** (register O1),
  surfaced by the routing/terms engine in E6.
- Full neutral IA is behind the `neutralIaV1` flag until the commerce it points at is built
  (Exchange/Wanted surfaces mature through E4/E9).
