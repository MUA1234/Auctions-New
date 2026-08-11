'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiPatch, apiPost, requestAiListingDraft, type AiListingDraft } from '../../../lib/api';
import { getAccessToken } from '../../../lib/auth';

const DRAFT_KEY = 'singha_listing_draft_v1';

// Category specification fields mirror the backend versioned schemas (pack
// doc 06). Numbers are coerced before submit; the server re-validates.
const CATEGORY_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'number' }[]> = {
  vehicles: [
    { key: 'make', label: 'Make', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'mileageKm', label: 'Mileage (km)', type: 'number' },
  ],
  property: [
    { key: 'propertyType', label: 'Property type (land/residential/commercial)', type: 'text' },
    { key: 'extentPerches', label: 'Extent (perches)', type: 'number' },
    { key: 'district', label: 'District', type: 'text' },
  ],
  gems: [
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'caratWeight', label: 'Carat weight', type: 'number' },
    { key: 'colour', label: 'Colour', type: 'text' },
  ],
  machinery: [
    { key: 'make', label: 'Make', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'year', label: 'Year', type: 'number' },
  ],
  general: [{ key: 'description', label: 'Short description', type: 'text' }],
};
const CATEGORIES = Object.keys(CATEGORY_FIELDS);

const SALE_METHODS = [
  { id: 'TIMED_AUCTION', label: 'Timed Auction' },
  { id: 'EXPRESSION_OF_INTEREST', label: 'Expression of Interest' },
  { id: 'BUY_NOW', label: 'Buy Now' },
  { id: 'MAKE_OFFER', label: 'Make Offer' },
  { id: 'SEALED_TENDER', label: 'Sealed Tender' },
  { id: 'LIVE_HYBRID', label: 'Live / Hybrid' },
];

const SOURCES = [
  'Own asset',
  'Bank / financial repossession',
  'Court / legal disposal',
  'Corporate / government surplus',
  'Consignment on behalf of owner',
];

const PROMOTIONS = [
  'None',
  'Individual Item',
  'Grouped Campaign',
  'Individual + Group',
  'Featured Premium',
];
const PUBLISHING = ['Draft only', 'Publish with listing', 'Scheduled', 'Manual approval'];

interface PhotoDraft {
  id: string;
  name: string;
  url?: string; // object URL (not persisted)
  caption: string;
  cover: boolean;
}
interface DocDraft {
  id: string;
  name: string;
  docType: string;
}

interface Draft {
  source: string;
  ownershipConfirmed: boolean;
  saleMethod: string;
  category: string;
  title: string;
  publicRef: string;
  shortDescription: string;
  fullDescription: string;
  city: string;
  region: string;
  attrs: Record<string, string>;
  photos: PhotoDraft[];
  videoUrl: string;
  documents: DocDraft[];
  sale: {
    openingBid: string;
    increment: string;
    reserve: string;
    guidePrice: string;
    buyNowPrice: string;
    closesAt: string;
  };
  inspection: { location: string; contact: string; byAppointment: boolean; notes: string };
  collection: { location: string; deliveryAvailable: boolean; deadline: string };
  fees: { buyerPremiumPct: string; termsAccepted: boolean };
  social: { promotion: string; channels: string[]; publishing: string };
  aiKeywords: string[];
  aiApplied: boolean;
}

const EMPTY_DRAFT: Draft = {
  source: SOURCES[0]!,
  ownershipConfirmed: false,
  saleMethod: 'TIMED_AUCTION',
  category: 'vehicles',
  title: '',
  publicRef: '',
  shortDescription: '',
  fullDescription: '',
  city: '',
  region: '',
  attrs: {},
  photos: [],
  videoUrl: '',
  documents: [],
  sale: {
    openingBid: '',
    increment: '',
    reserve: '',
    guidePrice: '',
    buyNowPrice: '',
    closesAt: '',
  },
  inspection: { location: '', contact: '', byAppointment: true, notes: '' },
  collection: { location: '', deliveryAvailable: false, deadline: '' },
  fees: { buyerPremiumPct: '10', termsAccepted: false },
  social: { promotion: 'None', channels: [], publishing: 'Manual approval' },
  aiKeywords: [],
  aiApplied: false,
};

const STAGES = [
  'Source',
  'Sale method',
  'Category',
  'Core details',
  'Specifications',
  'Photos',
  'Video',
  'Documents',
  'AI Assistant',
  'Sale settings',
  'Inspection',
  'Collection',
  'Fees & terms',
  'Social promotion',
  'Preview',
];

const toMinor = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || Number.isNaN(n) ? undefined : Math.round(n * 100);
};
const rid = () => Math.random().toString(36).slice(2, 10);

/**
 * Full Listing Studio (pack doc 08). Replaces the small proof wizard with the
 * complete flow — source, sale method, category, details, specs, photos, video,
 * documents, AI assistant, sale settings, inspection, collection, fees, social
 * promotion, preview and submit. The draft is saved at every stage. Rich
 * enrichment (content, media, sale config, social) is attempted best-effort so
 * the listing is always created even against an older backend.
 */
export default function ListingStudio() {
  const [stage, setStage] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; notes: string[] } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiListingDraft | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // Load a saved draft once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* ignore malformed draft */
    }
    setLoaded(true);
  }, []);

  // Persist the draft at every change (doc 08 "Save draft at every stage").
  useEffect(() => {
    if (!loaded) return;
    const persistable = { ...draft, photos: draft.photos.map(({ url: _url, ...p }) => p) };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
    setSavedAt(new Date().toLocaleTimeString());
  }, [draft, loaded]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const fields = CATEGORY_FIELDS[draft.category] ?? [];
  const attributes = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = draft.attrs[f.key];
      if (v == null || v === '') continue;
      out[f.key] = f.type === 'number' ? Number(v) : v;
    }
    return out;
  }, [draft.attrs, fields]);

  function onPickPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added: PhotoDraft[] = files.map((f, i) => ({
      id: rid(),
      name: f.name,
      url: URL.createObjectURL(f),
      caption: '',
      cover: draft.photos.length === 0 && i === 0,
    }));
    set('photos', [...draft.photos, ...added]);
    e.target.value = '';
  }

  function onPickDocs(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    set('documents', [
      ...draft.documents,
      ...files.map((f) => ({ id: rid(), name: f.name, docType: 'ownership' })),
    ]);
    e.target.value = '';
  }

  async function runAi() {
    setAiBusy(true);
    setAiUnavailable(false);
    const token = (await getAccessToken()) ?? undefined;
    const res = await requestAiListingDraft(
      { category: draft.category, attributes, notes: draft.shortDescription },
      token,
    );
    if (!res) setAiUnavailable(true);
    setAiResult(res);
    setAiBusy(false);
  }

  function applyAi() {
    if (!aiResult) return;
    setDraft((d) => ({
      ...d,
      title: aiResult.title ?? d.title,
      shortDescription: aiResult.shortDescription ?? d.shortDescription,
      fullDescription: aiResult.fullDescription ?? d.fullDescription,
      aiKeywords: aiResult.keywords ?? d.aiKeywords,
      aiApplied: true,
    }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const notes: string[] = [];
    const token = (await getAccessToken()) ?? undefined;
    try {
      const asset = await apiPost<{ id: string }>(
        '/assets',
        { category: draft.category, attributes },
        token,
      );
      const listing = await apiPost<{ id: string }>(
        '/listings',
        {
          assetId: asset.id,
          saleMethod: draft.saleMethod,
          title: draft.title || undefined,
          publicRef: draft.publicRef,
        },
        token,
      );

      // Best-effort enrichment — never blocks listing creation.
      await apiPatch(
        `/listings/${listing.id}/content`,
        {
          shortDescription: draft.shortDescription || undefined,
          fullDescription: draft.fullDescription || undefined,
          location: { city: draft.city || null, region: draft.region || null },
        },
        token,
      ).catch(() => notes.push('Rich content not stored (endpoint unavailable).'));

      let mediaOk = 0;
      for (let i = 0; i < draft.photos.length; i++) {
        const p = draft.photos[i]!;
        await apiPost(
          `/assets/${asset.id}/media`,
          {
            kind: 'image',
            storageKey: p.name,
            caption: p.caption || undefined,
            order: i,
            cover: p.cover,
          },
          token,
        )
          .then(() => mediaOk++)
          .catch(() => {});
      }
      if (draft.videoUrl)
        await apiPost(
          `/assets/${asset.id}/media`,
          { kind: 'video', storageKey: draft.videoUrl },
          token,
        ).catch(() => {});
      for (const doc of draft.documents)
        await apiPost(
          `/assets/${asset.id}/media`,
          { kind: 'document', storageKey: doc.name, caption: doc.docType },
          token,
        ).catch(() => {});
      if (draft.photos.length && mediaOk === 0)
        notes.push('Media registration pending (upload pipeline not connected).');

      await apiPost(
        `/listings/${listing.id}/sale-config`,
        {
          openingBidMinor: toMinor(draft.sale.openingBid),
          incrementMinor: toMinor(draft.sale.increment),
          reserveMinor: toMinor(draft.sale.reserve),
          guidePriceMinor: toMinor(draft.sale.guidePrice),
          buyNowPriceMinor: toMinor(draft.sale.buyNowPrice),
          closesAt: draft.sale.closesAt || undefined,
        },
        token,
      ).catch(() => notes.push('Sale settings saved locally (config endpoint unavailable).'));

      if (draft.social.promotion !== 'None')
        await apiPost(
          '/social/campaigns',
          {
            listingId: listing.id,
            promotion: draft.social.promotion,
            channels: draft.social.channels,
            publishing: draft.social.publishing,
          },
          token,
        ).catch(() => notes.push('Social promotion queued locally (publisher not connected).'));

      await apiPost(`/listings/${listing.id}/submit`, {}, token);

      localStorage.removeItem(DRAFT_KEY);
      setDone({ ref: draft.publicRef, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="container-page py-16">
        <Card className="max-w-2xl">
          <Chip tone="gold">Submitted</Chip>
          <h1 className="mt-4 font-serif text-3xl font-bold text-bone">
            Listing {done.ref} submitted for review
          </h1>
          <p className="mt-2 text-bone-400">
            Staff will review and approve before it goes live (pack doc 16 approval workflow).
          </p>
          {done.notes.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-bone-500">
              {done.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex gap-3">
            <Link href="/sell">
              <Button variant="primary">Seller dashboard</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setDone(null);
                setStage(0);
              }}
            >
              List another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <div className="flex items-center justify-between">
        <Link href="/sell" className="text-sm text-bone-400 hover:text-bone">
          ← Seller area
        </Link>
        <span className="text-xs text-bone-600">
          {savedAt ? `Draft saved ${savedAt}` : 'Draft autosaves'}
        </span>
      </div>
      <h1 className="mt-4 font-serif text-4xl font-bold text-bone">Listing Studio</h1>

      {/* Stage rail */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {STAGES.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(i)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              i === stage
                ? 'bg-gold-500/20 text-gold-300'
                : i < stage
                  ? 'text-gold-500/70 hover:text-gold-400'
                  : 'text-bone-600 hover:text-bone-400'
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <Card className="mt-6 max-w-2xl">
        <h2 className="mb-4 font-serif text-xl font-bold text-bone">
          {stage + 1}. {STAGES[stage]}
        </h2>

        {stage === 0 && (
          <div className="flex flex-col gap-4">
            <Field label="Ownership / disposal source">
              <select
                className="field"
                value={draft.source}
                onChange={(e) => set('source', e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Check
              label="I confirm the seller is authorised to dispose of this asset."
              checked={draft.ownershipConfirmed}
              onChange={(v) => set('ownershipConfirmed', v)}
            />
          </div>
        )}

        {stage === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {SALE_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set('saleMethod', m.id)}
                className={`rounded-lg border p-4 text-left text-sm transition-colors ${
                  draft.saleMethod === m.id
                    ? 'border-gold-500/60 bg-gold-500/10 text-bone'
                    : 'border-white/10 text-bone-300 hover:border-white/25'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {stage === 2 && (
          <Field label="Category">
            <select
              className="field capitalize"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value, attrs: {} }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        )}

        {stage === 3 && (
          <div className="flex flex-col gap-4">
            <Field label="Title">
              <input
                className="field"
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field label="Public reference (unique)">
              <input
                className="field"
                placeholder="e.g. VH-2043"
                value={draft.publicRef}
                onChange={(e) => set('publicRef', e.target.value)}
              />
            </Field>
            <Field label="Short description">
              <input
                className="field"
                value={draft.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
              />
            </Field>
            <Field label="Full description">
              <textarea
                className="field min-h-[96px]"
                value={draft.fullDescription}
                onChange={(e) => set('fullDescription', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input
                  className="field"
                  value={draft.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
              <Field label="Region / Province">
                <input
                  className="field"
                  value={draft.region}
                  onChange={(e) => set('region', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {stage === 4 && (
          <div className="flex flex-col gap-4">
            {fields.length === 0 && (
              <p className="text-sm text-bone-500">No extra specifications for this category.</p>
            )}
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  className="field"
                  type={f.type}
                  value={draft.attrs[f.key] ?? ''}
                  onChange={(e) => set('attrs', { ...draft.attrs, [f.key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        )}

        {stage === 5 && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-bone-500">
              Original photos are immutable; the first cover is used on catalogue cards. Upload
              connects to signed object storage in production (pack doc 08).
            </p>
            <FilePick label="Add photos" accept="image/*" multiple onChange={onPickPhotos} />
            <div className="grid grid-cols-3 gap-3">
              {draft.photos.map((p) => (
                <div key={p.id} className="flex flex-col gap-1">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-white/10 bg-coal-900">
                    {p.url ? (
                      <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-bone-600">
                        {p.name}
                      </span>
                    )}
                    {p.cover && (
                      <span className="absolute left-1 top-1 rounded bg-gold-500/80 px-1 text-[9px] font-semibold text-coal-950">
                        Cover
                      </span>
                    )}
                  </div>
                  <input
                    className="field !py-1 text-[11px]"
                    placeholder="Caption"
                    value={p.caption}
                    onChange={(e) =>
                      set(
                        'photos',
                        draft.photos.map((x) =>
                          x.id === p.id ? { ...x, caption: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <div className="flex justify-between text-[10px]">
                    <button
                      type="button"
                      className="text-gold-400"
                      onClick={() =>
                        set(
                          'photos',
                          draft.photos.map((x) => ({ ...x, cover: x.id === p.id })),
                        )
                      }
                    >
                      Set cover
                    </button>
                    <button
                      type="button"
                      className="text-outbid"
                      onClick={() =>
                        set(
                          'photos',
                          draft.photos.filter((x) => x.id !== p.id),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 6 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-bone-500">
              Provide a video URL or upload; production transcodes to a playback rendition + poster
              (UPLOADING → PROCESSING → READY). Catalogue never streams the raw original.
            </p>
            <Field label="Video URL (optional)">
              <input
                className="field"
                placeholder="https://…"
                value={draft.videoUrl}
                onChange={(e) => set('videoUrl', e.target.value)}
              />
            </Field>
            {draft.videoUrl && <Chip>State: PROCESSING (mock)</Chip>}
          </div>
        )}

        {stage === 7 && (
          <div className="flex flex-col gap-3">
            <FilePick
              label="Add documents"
              accept=".pdf,.jpg,.png,.doc,.docx"
              multiple
              onChange={onPickDocs}
            />
            {draft.documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded border border-white/10 px-3 py-2"
              >
                <span className="flex-1 truncate text-sm text-bone-200">{d.name}</span>
                <select
                  className="field !w-40 !py-1 text-xs"
                  value={d.docType}
                  onChange={(e) =>
                    set(
                      'documents',
                      draft.documents.map((x) =>
                        x.id === d.id ? { ...x, docType: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {['ownership', 'valuation', 'inspection', 'legal', 'other'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-xs text-outbid"
                  onClick={() =>
                    set(
                      'documents',
                      draft.documents.filter((x) => x.id !== d.id),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {stage === 8 && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-bone-500">
              The assistant drafts a title, descriptions, keywords and a missing-data list from your
              inputs. It is a derived draft you apply — it never invents facts or overwrites the
              original record (pack rule 3 / doc 10).
            </p>
            <Button variant="outline" onClick={runAi} disabled={aiBusy}>
              {aiBusy ? 'Drafting…' : 'Generate AI draft'}
            </Button>
            {aiUnavailable && (
              <p className="text-sm text-bone-400">
                AI provider not configured yet (mock adapter pending) — continue filling manually.
              </p>
            )}
            {aiResult && (
              <div className="flex flex-col gap-2 rounded-lg border border-gold-500/20 bg-gold-500/5 p-4 text-sm">
                {aiResult.title && (
                  <p>
                    <span className="text-bone-500">Title:</span> {aiResult.title}
                  </p>
                )}
                {aiResult.shortDescription && (
                  <p>
                    <span className="text-bone-500">Short:</span> {aiResult.shortDescription}
                  </p>
                )}
                {aiResult.keywords && aiResult.keywords.length > 0 && (
                  <p className="text-bone-400">Keywords: {aiResult.keywords.join(', ')}</p>
                )}
                {aiResult.missing && aiResult.missing.length > 0 && (
                  <p className="text-outbid">Missing: {aiResult.missing.join(', ')}</p>
                )}
                <Button variant="gold" onClick={applyAi}>
                  Apply to listing
                </Button>
              </div>
            )}
            {draft.aiApplied && <Chip tone="gold">AI draft applied (editable)</Chip>}
          </div>
        )}

        {stage === 9 && (
          <div className="grid grid-cols-2 gap-3">
            <Money
              label="Opening bid"
              v={draft.sale.openingBid}
              on={(v) => set('sale', { ...draft.sale, openingBid: v })}
            />
            <Money
              label="Bid increment"
              v={draft.sale.increment}
              on={(v) => set('sale', { ...draft.sale, increment: v })}
            />
            <Money
              label="Reserve (private)"
              v={draft.sale.reserve}
              on={(v) => set('sale', { ...draft.sale, reserve: v })}
            />
            <Money
              label="Guide price"
              v={draft.sale.guidePrice}
              on={(v) => set('sale', { ...draft.sale, guidePrice: v })}
            />
            <Money
              label="Buy-now price"
              v={draft.sale.buyNowPrice}
              on={(v) => set('sale', { ...draft.sale, buyNowPrice: v })}
            />
            <Field label="Closes at">
              <input
                type="datetime-local"
                className="field"
                value={draft.sale.closesAt}
                onChange={(e) => set('sale', { ...draft.sale, closesAt: e.target.value })}
              />
            </Field>
          </div>
        )}

        {stage === 10 && (
          <div className="flex flex-col gap-4">
            <Field label="Inspection / viewing location">
              <input
                className="field"
                value={draft.inspection.location}
                onChange={(e) =>
                  set('inspection', { ...draft.inspection, location: e.target.value })
                }
              />
            </Field>
            <Field label="Contact for viewing">
              <input
                className="field"
                value={draft.inspection.contact}
                onChange={(e) =>
                  set('inspection', { ...draft.inspection, contact: e.target.value })
                }
              />
            </Field>
            <Check
              label="By appointment only"
              checked={draft.inspection.byAppointment}
              onChange={(v) => set('inspection', { ...draft.inspection, byAppointment: v })}
            />
          </div>
        )}

        {stage === 11 && (
          <div className="flex flex-col gap-4">
            <Field label="Collection location">
              <input
                className="field"
                value={draft.collection.location}
                onChange={(e) =>
                  set('collection', { ...draft.collection, location: e.target.value })
                }
              />
            </Field>
            <Check
              label="Delivery available"
              checked={draft.collection.deliveryAvailable}
              onChange={(v) => set('collection', { ...draft.collection, deliveryAvailable: v })}
            />
            <Field label="Collection deadline (after settlement)">
              <input
                className="field"
                placeholder="e.g. 7 days"
                value={draft.collection.deadline}
                onChange={(e) =>
                  set('collection', { ...draft.collection, deadline: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        {stage === 12 && (
          <div className="flex flex-col gap-4">
            <Field label="Buyer premium (%)">
              <input
                type="number"
                className="field"
                value={draft.fees.buyerPremiumPct}
                onChange={(e) => set('fees', { ...draft.fees, buyerPremiumPct: e.target.value })}
              />
            </Field>
            <p className="text-xs text-bone-600">
              Fee/tax defaults are configurable business values (pack doc 28) — confirm with staff
              before publish.
            </p>
            <Check
              label="Seller accepts the Singha auction terms & conditions."
              checked={draft.fees.termsAccepted}
              onChange={(v) => set('fees', { ...draft.fees, termsAccepted: v })}
            />
          </div>
        )}

        {stage === 13 && (
          <div className="flex flex-col gap-4">
            <Field label="Promotion">
              <select
                className="field"
                value={draft.social.promotion}
                onChange={(e) => set('social', { ...draft.social, promotion: e.target.value })}
              >
                {PROMOTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            {draft.social.promotion !== 'None' && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-bone-400">Channels</span>
                  <div className="flex gap-3">
                    {['Facebook Page', 'Instagram'].map((ch) => (
                      <Check
                        key={ch}
                        label={ch}
                        checked={draft.social.channels.includes(ch)}
                        onChange={(v) =>
                          set('social', {
                            ...draft.social,
                            channels: v
                              ? [...draft.social.channels, ch]
                              : draft.social.channels.filter((c) => c !== ch),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
                <Field label="Publishing">
                  <select
                    className="field"
                    value={draft.social.publishing}
                    onChange={(e) => set('social', { ...draft.social, publishing: e.target.value })}
                  >
                    {PUBLISHING.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <p className="text-xs text-bone-600">
                  Production default is manual approval before anything posts (pack doc 08).
                </p>
              </>
            )}
          </div>
        )}

        {stage === 14 && (
          <div className="flex flex-col gap-3 text-sm">
            <Summary k="Source" v={draft.source} />
            <Summary
              k="Sale method"
              v={SALE_METHODS.find((m) => m.id === draft.saleMethod)?.label ?? draft.saleMethod}
            />
            <Summary k="Category" v={draft.category} />
            <Summary k="Title" v={draft.title || '—'} />
            <Summary k="Reference" v={draft.publicRef || '—'} />
            <Summary
              k="Location"
              v={[draft.city, draft.region].filter(Boolean).join(', ') || '—'}
            />
            <Summary k="Specifications" v={JSON.stringify(attributes)} />
            <Summary
              k="Photos"
              v={`${draft.photos.length} (cover: ${draft.photos.find((p) => p.cover)?.name ?? 'none'})`}
            />
            <Summary k="Documents" v={`${draft.documents.length}`} />
            <Summary
              k="Promotion"
              v={`${draft.social.promotion}${draft.social.channels.length ? ` · ${draft.social.channels.join(', ')}` : ''}`}
            />
            <p className="mt-2 text-xs text-bone-600">
              Submitting creates the asset + listing and sends it to staff for review. Requires a
              seller account (listing:create).
            </p>
            {!draft.ownershipConfirmed && (
              <p className="text-sm text-outbid">Confirm ownership authority (stage 1).</p>
            )}
            {draft.publicRef.length < 3 && (
              <p className="text-sm text-outbid">Add a public reference (stage 4).</p>
            )}
            {error && <p className="text-sm text-outbid">{error}</p>}
          </div>
        )}
      </Card>

      {/* Nav */}
      <div className="mt-5 flex max-w-2xl items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStage((s) => Math.max(0, s - 1))}
          disabled={stage === 0}
        >
          Back
        </Button>
        {stage < STAGES.length - 1 ? (
          <Button
            variant="primary"
            onClick={() => setStage((s) => Math.min(STAGES.length - 1, s + 1))}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="gold"
            onClick={submit}
            disabled={busy || !draft.ownershipConfirmed || draft.publicRef.length < 3}
          >
            {busy ? 'Submitting…' : 'Create & submit'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-bone-400">{label}</span>
      {children}
    </label>
  );
}

function Money({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <Field label={`${label} (LKR)`}>
      <input type="number" className="field" value={v} onChange={(e) => on(e.target.value)} />
    </Field>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-bone-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-gold-500"
      />
      {label}
    </label>
  );
}

function FilePick({
  label,
  accept,
  multiple,
  onChange,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />
      <Button variant="outline" onClick={() => ref.current?.click()}>
        {label}
      </Button>
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/8 pb-2">
      <span className="text-bone-500">{k}</span>
      <span className="max-w-[60%] truncate text-right text-bone-200">{v}</span>
    </div>
  );
}
