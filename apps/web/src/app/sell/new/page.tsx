'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiPost } from '../../../lib/api';

const TOKEN_KEY = 'singha_demo_token';

// Field sets mirror the backend category schemas (docs/06). Numeric fields are
// coerced before submit; the server re-validates against the versioned schema.
const CATEGORY_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'number' }[]> = {
  vehicles: [
    { key: 'make', label: 'Make', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'mileageKm', label: 'Mileage (km)', type: 'number' },
  ],
  property: [
    { key: 'propertyType', label: 'Property type (land/residential/commercial/…)', type: 'text' },
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
  general: [{ key: 'description', label: 'Description', type: 'text' }],
};
const CATEGORIES = Object.keys(CATEGORY_FIELDS);
const SALE_METHODS = [
  'TIMED_AUCTION',
  'EXPRESSION_OF_INTEREST',
  'BUY_NOW',
  'MAKE_OFFER',
  'SEALED_TENDER',
  'LIVE_HYBRID',
];

export default function ListingWizard() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('vehicles');
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [saleMethod, setSaleMethod] = useState('TIMED_AUCTION');
  const [title, setTitle] = useState('');
  const [publicRef, setPublicRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = CATEGORY_FIELDS[category] ?? [];
  const attributes = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = attrs[f.key];
      if (v == null || v === '') continue;
      out[f.key] = f.type === 'number' ? Number(v) : v;
    }
    return out;
  }, [attrs, fields]);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    const token = localStorage.getItem(TOKEN_KEY) ?? undefined;
    try {
      const asset = await apiPost<{ id: string }>('/assets', { category, attributes }, token);
      const listing = await apiPost<{ id: string }>(
        '/listings',
        { assetId: asset.id, saleMethod, title: title || undefined, publicRef },
        token,
      );
      await apiPost(`/listings/${listing.id}/submit`, {}, token);
      setResult(`Listing ${publicRef} created and submitted for review.`);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page py-14">
      <Link href="/sell" className="text-sm text-bone-400 hover:text-bone">
        ← Seller area
      </Link>
      <h1 className="mt-4 font-serif text-4xl font-bold text-bone">List an asset</h1>
      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <Chip key={s} tone={step >= s ? 'gold' : undefined}>
            {s}. {s === 1 ? 'Asset' : s === 2 ? 'Sale' : 'Review'}
          </Chip>
        ))}
      </div>

      <Card className="mt-8 max-w-2xl">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <label className="text-sm text-bone-400">Category</label>
            <select
              className="field capitalize"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setAttrs({});
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-sm text-bone-400">{f.label}</label>
                <input
                  className="field"
                  type={f.type}
                  value={attrs[f.key] ?? ''}
                  onChange={(e) => setAttrs((a) => ({ ...a, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button variant="primary" onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <label className="text-sm text-bone-400">Sale method</label>
            <select
              className="field"
              value={saleMethod}
              onChange={(e) => setSaleMethod(e.target.value)}
            >
              {SALE_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <label className="text-sm text-bone-400">Title (optional)</label>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="text-sm text-bone-400">Public reference (unique)</label>
            <input
              className="field"
              placeholder="e.g. VH-2043"
              value={publicRef}
              onChange={(e) => setPublicRef(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)} disabled={publicRef.length < 3}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-sm font-semibold text-bone">Review</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-bone-500">Category</dt>
              <dd className="capitalize text-bone-200">{category}</dd>
              <dt className="text-bone-500">Sale method</dt>
              <dd className="text-bone-200">{saleMethod.replace(/_/g, ' ')}</dd>
              <dt className="text-bone-500">Reference</dt>
              <dd className="text-bone-200">{publicRef}</dd>
              <dt className="text-bone-500">Attributes</dt>
              <dd className="text-bone-200">{JSON.stringify(attributes)}</dd>
            </dl>
            <p className="text-xs text-bone-600">
              Requires a seller account (listing:create). Submitting sends it to staff for review.
            </p>
            {error && <p className="text-sm text-outbid">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="gold" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Create & submit'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#5fd0a3]">{result}</p>
            <Link href="/sell">
              <Button variant="primary">Back to seller dashboard</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
