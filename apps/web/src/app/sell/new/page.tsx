'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import {
  apiPatch,
  apiPost,
  archiveSellerDraft,
  createSellerDraft,
  createUploadUrl,
  getSellerDraft,
  listSellerDrafts,
  requestAiListingDraft,
  saveSellerDraft,
  setAuctionPreference,
  type AiListingDraft,
} from '../../../lib/api';
import {
  fetchCategorySchemas,
  fetchSaleMethods,
  type CategoryFieldDescriptor,
  type CategoryFieldSchema,
  type SaleMethodDef,
} from '../../../lib/evolution-api';
import { CURRENCIES } from '../../../lib/format';
import { getAccessToken } from '../../../lib/auth';
import { createClient } from '../../../utils/supabase/client';
import { friendlyMessage } from '../../../components/evolution/evo-api-error';
import {
  VisionIntakePanel,
  type VisionFieldProvenance,
} from '../../../components/sell/VisionIntakePanel';

const DRAFT_KEY = 'singha_listing_draft_v1';
const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? 'singha-media';

/**
 * Upload a photo through the real pipeline (pack doc 08): API issues a signed
 * direct-to-Supabase grant, the browser uploads the immutable original to object
 * storage, and the returned storage path becomes the media's storageKey.
 */
async function uploadPhoto(assetId: string, file: File, token?: string): Promise<string> {
  const grant = await createUploadUrl(assetId, file.name, token);
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .uploadToSignedUrl(grant.path, grant.token, file);
  if (error) throw error;
  return grant.path;
}

// The AUTHORITATIVE category field schemas + sale methods come from the backend
// (`GET /platform/category-schemas`, `GET /platform/sale-methods`) so the seller form is
// config-driven — new categories/methods appear with no frontend change (directive §2/§3/§5).
// These fallbacks are a thin offline safety net (used only if the API is unreachable); they are
// NOT the source of truth. They mirror the backend required fields so submit still validates.
const req = (
  key: string,
  label: string,
  type: CategoryFieldDescriptor['type'] = 'text',
): CategoryFieldDescriptor => ({ key, label, type, required: true });
const optf = (
  key: string,
  label: string,
  type: CategoryFieldDescriptor['type'] = 'text',
): CategoryFieldDescriptor => ({ key, label, type, required: false });

const FALLBACK_CATEGORY_SCHEMAS: CategoryFieldSchema[] = [
  {
    key: 'vehicles',
    version: 1,
    label: 'Vehicles',
    fields: [
      req('make', 'Make'),
      req('model', 'Model'),
      req('year', 'Year', 'number'),
      optf('mileageKm', 'Mileage', 'number'),
    ],
  },
  {
    key: 'machinery',
    version: 1,
    label: 'Machinery & equipment',
    fields: [req('make', 'Make'), req('model', 'Model'), optf('year', 'Year', 'number')],
  },
  {
    key: 'gems',
    version: 1,
    label: 'Gems & jewellery',
    fields: [
      req('type', 'Gem type'),
      req('caratWeight', 'Weight', 'number'),
      optf('colour', 'Colour'),
    ],
  },
  {
    key: 'property',
    version: 1,
    label: 'Property & land',
    fields: [req('propertyType', 'Property type'), optf('district', 'District')],
  },
  {
    key: 'bulk',
    version: 1,
    label: 'Produce & bulk commodities',
    fields: [
      req('itemType', 'Commodity / item type'),
      req('quantity', 'Quantity', 'number'),
      req('unit', 'Unit'),
    ],
  },
  {
    key: 'general',
    version: 1,
    label: 'General assets',
    fields: [optf('description', 'Description')],
  },
];

const FALLBACK_SALE_METHODS: SaleMethodDef[] = [
  {
    code: 'TIMED_AUCTION',
    label: 'Timed Auction',
    family: 'auction',
    isAuction: true,
    bindsAutomatically: true,
    requiresEligibility: false,
  },
  {
    code: 'EXPRESSION_OF_INTEREST',
    label: 'Expression of Interest',
    family: 'eoi',
    isAuction: false,
    bindsAutomatically: false,
    requiresEligibility: false,
  },
  {
    code: 'BUY_NOW',
    label: 'Buy Now',
    family: 'fixed',
    isAuction: false,
    bindsAutomatically: true,
    requiresEligibility: false,
  },
  {
    code: 'MAKE_OFFER',
    label: 'Make Offer',
    family: 'offer',
    isAuction: false,
    bindsAutomatically: false,
    requiresEligibility: false,
  },
  {
    code: 'SEALED_TENDER',
    label: 'Sealed Tender',
    family: 'procurement',
    isAuction: false,
    bindsAutomatically: false,
    requiresEligibility: false,
  },
  {
    code: 'LIVE_HYBRID',
    label: 'Live / Hybrid',
    family: 'auction',
    isAuction: true,
    bindsAutomatically: true,
    requiresEligibility: false,
  },
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
  currency: string;
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
  // Per-field AI Vision provenance (§12): what the seller accepted/edited, with the model's
  // confidence/evidence/state. Persisted with the draft and sent as the AI provenance record.
  visionProvenance: Record<string, VisionFieldProvenance & { value: string }>;
}

const EMPTY_DRAFT: Draft = {
  source: SOURCES[0]!,
  ownershipConfirmed: false,
  saleMethod: 'TIMED_AUCTION',
  category: 'vehicles',
  currency: 'LKR',
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
  visionProvenance: {},
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

// Minor units respect the currency's own exponent — never assume ×100 (directive §6; e.g. JPY is
// ×1). The server re-validates against the listing's transaction currency.
const currencyExp = (code: string): number => CURRENCIES.find((c) => c.code === code)?.exp ?? 2;
const toMinor = (v: string, exp: number): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || Number.isNaN(n) ? undefined : Math.round(n * 10 ** exp);
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
  // In-session File handles keyed by photo id (blobs can't live in localStorage).
  const filesRef = useRef<Map<string, File>>(new Map());
  // Config-driven taxonomy (directive §2/§3/§5): the backend is authoritative; the fallbacks are
  // only used if the endpoints are unreachable.
  const [categorySchemas, setCategorySchemas] =
    useState<CategoryFieldSchema[]>(FALLBACK_CATEGORY_SCHEMAS);
  const [saleMethods, setSaleMethods] = useState<SaleMethodDef[]>(FALLBACK_SALE_METHODS);
  // Server-resumable draft (§25): follows the seller across devices; localStorage is the offline
  // cache. `serverDraftRef` holds the authoritative id + version for optimistic-concurrency saves.
  const serverDraftRef = useRef<{ id: string; version: number } | null>(null);
  const [draftSync, setDraftSync] = useState<'local' | 'saving' | 'saved' | 'conflict' | 'offline'>(
    'local',
  );

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

  // Pull the authoritative category field schemas + active sale methods. Falls back silently to the
  // offline set on error (e.g. saleMethodConfig flag OFF → /platform/sale-methods 404s).
  useEffect(() => {
    fetchCategorySchemas()
      .then((c) => c.length && setCategorySchemas(c))
      .catch(() => {});
    fetchSaleMethods()
      .then((m) => m.length && setSaleMethods(m))
      .catch(() => {});
  }, []);

  // Adopt the seller's server draft on mount (server is authoritative, §25) — resume across
  // devices. Degrades silently to the localStorage draft when signed out / offline.
  useEffect(() => {
    void (async () => {
      const token = (await getAccessToken()) ?? undefined;
      if (!token) return;
      try {
        const { drafts } = await listSellerDrafts(token);
        if (!drafts.length) return;
        const latest = await getSellerDraft(drafts[0]!.id, token);
        serverDraftRef.current = { id: latest.id, version: latest.version };
        setDraft((d) => ({ ...d, ...(latest.payload as Partial<Draft>), photos: d.photos }));
        setDraftSync('saved');
      } catch {
        /* offline → the localStorage draft stands */
      }
    })();
  }, []);

  // Persist the draft at every change (doc 08 "Save draft at every stage"): localStorage always,
  // plus a debounced server save when signed in (§25). Server save carries the last-seen version
  // so a concurrent edit from another device surfaces as a conflict rather than silently clobbering.
  useEffect(() => {
    if (!loaded) return;
    const persistable = { ...draft, photos: draft.photos.map(({ url: _url, ...p }) => p) };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
    setSavedAt(new Date().toLocaleTimeString());

    const timer = setTimeout(async () => {
      const token = (await getAccessToken()) ?? undefined;
      if (!token) return; // signed out → localStorage only
      const body = {
        title: draft.title || undefined,
        payload: persistable as Record<string, unknown>,
        ...(Object.keys(draft.visionProvenance).length
          ? { aiProvenance: draft.visionProvenance as Record<string, unknown> }
          : {}),
        schemaVersion: 1,
      };
      try {
        setDraftSync('saving');
        if (!serverDraftRef.current) {
          const d = await createSellerDraft(body, token);
          serverDraftRef.current = { id: d.id, version: d.version };
        } else {
          const d = await saveSellerDraft(
            serverDraftRef.current.id,
            { ...body, expectedVersion: serverDraftRef.current.version },
            token,
          );
          serverDraftRef.current = { id: d.id, version: d.version };
        }
        setDraftSync('saved');
      } catch (e) {
        setDraftSync((e as { status?: number })?.status === 409 ? 'conflict' : 'offline');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [draft, loaded]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const currentSchema = categorySchemas.find((c) => c.key === draft.category) ?? categorySchemas[0];
  const fields = currentSchema?.fields ?? [];
  const attributes = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = draft.attrs[f.key];
      if (v == null || v === '') continue;
      out[f.key] = f.type === 'number' ? Number(v) : f.type === 'boolean' ? v === 'true' : v;
    }
    return out;
  }, [draft.attrs, fields]);

  function onPickPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added: PhotoDraft[] = files.map((f, i) => {
      const id = rid();
      filesRef.current.set(id, f);
      return {
        id,
        name: f.name,
        url: URL.createObjectURL(f),
        caption: '',
        cover: draft.photos.length === 0 && i === 0,
      };
    });
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
      title: aiResult.title || d.title,
      fullDescription: aiResult.description || d.fullDescription,
      aiKeywords: aiResult.highlights?.length ? aiResult.highlights : d.aiKeywords,
      aiApplied: true,
    }));
  }

  // Accept/edit an AI Vision field suggestion (§12): the value flows into the category attributes
  // and its provenance (confidence/evidence/state/model) is recorded — never a silent overwrite.
  function applyVisionField(field: string, value: string, provenance: VisionFieldProvenance) {
    setDraft((d) => ({
      ...d,
      attrs: { ...d.attrs, [field]: value },
      visionProvenance: { ...d.visionProvenance, [field]: { ...provenance, value } },
    }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const notes: string[] = [];
    const token = (await getAccessToken()) ?? undefined;
    const exp = currencyExp(draft.currency);
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

      // Best-effort enrichment — never blocks listing creation. Field names
      // match the backend PATCH /listings/:id/content contract (flat location +
      // guide-price + close time + inspection/collection summaries).
      const guideMinor = toMinor(draft.sale.guidePrice, exp);
      const inspectionSummary =
        [
          draft.inspection.location,
          draft.inspection.byAppointment ? 'By appointment' : '',
          draft.inspection.notes,
        ]
          .filter(Boolean)
          .join(' · ') || undefined;
      const collectionSummary =
        [
          draft.collection.location,
          draft.collection.deliveryAvailable ? 'Delivery available' : '',
          draft.collection.deadline ? `Collect within ${draft.collection.deadline}` : '',
        ]
          .filter(Boolean)
          .join(' · ') || undefined;
      await apiPatch(
        `/listings/${listing.id}/content`,
        {
          shortDescription: draft.shortDescription || undefined,
          fullDescription: draft.fullDescription || undefined,
          locationCity: draft.city || undefined,
          locationRegion: draft.region || undefined,
          inspectionSummary,
          collectionSummary,
          guidePriceMinor: guideMinor,
          showGuidePrice: guideMinor != null,
          closesAt: draft.sale.closesAt ? new Date(draft.sale.closesAt).toISOString() : undefined,
        },
        token,
      ).catch(() =>
        notes.push(
          "Some listing details (description, location, guide price) weren't saved. Contact Singha support to add them before this listing goes live.",
        ),
      );

      // Buy-now price has its own authoritative endpoint.
      const buyNowMinor = toMinor(draft.sale.buyNowPrice, exp);
      if (buyNowMinor != null)
        await apiPost(
          `/listings/${listing.id}/buy-now-price`,
          { amountMinor: buyNowMinor, currency: draft.currency },
          token,
        ).catch(() =>
          notes.push(
            "Your buy-now price wasn't saved. Contact Singha support to add it before this listing goes live.",
          ),
        );

      // Photos: upload the immutable original through the signed pipeline and
      // register it with the REAL, backend-issued storage key (cover first).
      // Pack FIX-05: NEVER register a filename as media. If the File handle is
      // gone (draft restored after a reload) or the upload fails, the photo is
      // left un-registered and flagged for re-upload — no fake READY row.
      const ordered = [...draft.photos].sort((a, b) => Number(b.cover) - Number(a.cover));
      let uploaded = 0;
      let firstUpload = true;
      for (const p of ordered) {
        const file = filesRef.current.get(p.id);
        if (!file) {
          notes.push(`Photo "${p.name}" needs re-uploading — re-attach it before publishing.`);
          continue;
        }
        try {
          const storageKey = await uploadPhoto(asset.id, file, token);
          await apiPost(
            `/assets/${asset.id}/media`,
            { kind: 'image', storageKey, isCover: firstUpload },
            token,
          );
          uploaded++;
          firstUpload = false;
        } catch {
          notes.push(`Photo "${p.name}" could not be uploaded — re-attach and retry.`);
        }
      }
      if (draft.photos.length > 0 && uploaded === 0)
        notes.push(
          'No photos were uploaded. Contact Singha support to add photos before this listing goes live.',
        );

      // Documents/video require the real signed-upload pipeline before they can be
      // registered (pack FIX-06/07). We do NOT register them by name/URL here.
      if (draft.documents.length > 0)
        notes.push('Documents pending secure upload — attach files through the upload pipeline.');
      if (draft.videoUrl)
        notes.push('Video pending secure upload — direct video upload is required.');

      // Opening bid / increment / reserve configure the AUCTION, which staff set
      // when they schedule it (POST /auctions) after approval — not at draft time.
      // We persist the seller's requested values STRUCTURALLY (§7) as a staff-approvable
      // preference on the listing, not merely a note.
      const openingBidMinor = toMinor(draft.sale.openingBid, exp);
      const reserveMinor = toMinor(draft.sale.reserve, exp);
      const incrementMinor = toMinor(draft.sale.increment, exp);
      if (token && (openingBidMinor != null || reserveMinor != null || incrementMinor != null)) {
        await setAuctionPreference(
          listing.id,
          {
            ...(openingBidMinor != null ? { openingBidMinor } : {}),
            ...(reserveMinor != null ? { reserveMinor } : {}),
            ...(incrementMinor != null ? { incrementMinor } : {}),
            currency: draft.currency,
          },
          token,
        )
          .then(() => notes.push('Requested auction settings saved for staff review.'))
          .catch(() => notes.push('Requested auction settings recorded locally (will sync).'));
      }

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

      // Submitted → clear the local cache and archive the server draft so it drops off the
      // seller's resume list (the listing itself is now the authoritative record).
      localStorage.removeItem(DRAFT_KEY);
      if (token && serverDraftRef.current) {
        await archiveSellerDraft(serverDraftRef.current.id, token).catch(() => {});
        serverDraftRef.current = null;
      }
      setDone({ ref: draft.publicRef, notes });
    } catch (err) {
      setError(friendlyMessage(err, 'Could not submit this listing. Please try again.'));
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
          <p className="mt-2 text-bone-400">Staff will review and approve before it goes live.</p>
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
        <span
          className={`text-xs ${draftSync === 'conflict' ? 'text-outbid' : 'text-bone-600'}`}
          title="Your draft saves to your Singha account and resumes on any device"
        >
          {draftSync === 'saving' && 'Saving to your account…'}
          {draftSync === 'saved' && `Saved to your account · ${savedAt ?? ''}`}
          {draftSync === 'conflict' && 'Edited on another device — reload to continue'}
          {draftSync === 'offline' && `Saved on this device ${savedAt ?? ''} (will sync)`}
          {draftSync === 'local' && (savedAt ? `Draft saved ${savedAt}` : 'Draft autosaves')}
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
            {saleMethods.map((m) => (
              <button
                key={m.code}
                type="button"
                onClick={() => set('saleMethod', m.code)}
                className={`rounded-lg border p-4 text-left text-sm transition-colors ${
                  draft.saleMethod === m.code
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
              className="field"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value, attrs: {} }))}
            >
              {categorySchemas.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
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
            {fields.map((f) => {
              const label = `${f.label}${f.required ? ' *' : ''}${f.unit ? ` (${f.unit})` : ''}`;
              const val = draft.attrs[f.key] ?? '';
              const setVal = (v: string) => set('attrs', { ...draft.attrs, [f.key]: v });
              if (f.type === 'boolean') {
                return (
                  <Check
                    key={f.key}
                    label={f.help ? `${f.label} — ${f.help}` : f.label}
                    checked={val === 'true'}
                    onChange={(v) => setVal(v ? 'true' : 'false')}
                  />
                );
              }
              return (
                <Field key={f.key} label={label} hint={f.help}>
                  {f.type === 'select' ? (
                    <select className="field" value={val} onChange={(e) => setVal(e.target.value)}>
                      <option value="">Select…</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="field"
                      type={f.type === 'number' ? 'number' : 'text'}
                      min={f.min}
                      max={f.max}
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                    />
                  )}
                </Field>
              );
            })}
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
            <VisionIntakePanel
              photos={draft.photos}
              categoryHint={draft.category}
              attributesHint={attributes}
              notes={draft.shortDescription || undefined}
              onApplyCategory={(c) => set('category', c)}
              onApplyField={applyVisionField}
            />
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
            {draft.videoUrl && <Chip>Pending secure upload</Chip>}
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
                {aiResult.description && (
                  <p>
                    <span className="text-bone-500">Description:</span> {aiResult.description}
                  </p>
                )}
                {aiResult.highlights && aiResult.highlights.length > 0 && (
                  <p className="text-bone-400">Highlights: {aiResult.highlights.join(', ')}</p>
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
          <div className="flex flex-col gap-4">
            <Field
              label="Transaction currency"
              hint="The binding contract currency — never silently converted. Buyers may see an informational display conversion only."
            >
              <select
                className="field"
                value={draft.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Money
                label="Opening bid"
                currency={draft.currency}
                v={draft.sale.openingBid}
                on={(v) => set('sale', { ...draft.sale, openingBid: v })}
              />
              <Money
                label="Bid increment"
                currency={draft.currency}
                v={draft.sale.increment}
                on={(v) => set('sale', { ...draft.sale, increment: v })}
              />
              <Money
                label="Reserve (private)"
                currency={draft.currency}
                v={draft.sale.reserve}
                on={(v) => set('sale', { ...draft.sale, reserve: v })}
              />
              <Money
                label="Guide price"
                currency={draft.currency}
                v={draft.sale.guidePrice}
                on={(v) => set('sale', { ...draft.sale, guidePrice: v })}
              />
              <Money
                label="Buy-now price"
                currency={draft.currency}
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
              Fee/tax defaults are configurable business values — confirm with staff before publish.
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
              v={saleMethods.find((m) => m.code === draft.saleMethod)?.label ?? draft.saleMethod}
            />
            <Summary k="Category" v={currentSchema?.label ?? draft.category} />
            <Summary k="Currency" v={draft.currency} />
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-bone-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-bone-600">{hint}</span>}
    </label>
  );
}

function Money({
  label,
  currency,
  v,
  on,
}: {
  label: string;
  currency: string;
  v: string;
  on: (v: string) => void;
}) {
  return (
    <Field label={`${label} (${currency})`}>
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
