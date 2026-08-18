'use client';

import { useState } from 'react';
import { Button } from '@singha/ui';
import {
  requestVisionIntake,
  type VisionFieldSuggestion,
  type VisionIntakeResult,
} from '../../lib/api';
import { getAccessToken } from '../../lib/auth';

export interface VisionFieldProvenance {
  confidence: number;
  source: string;
  state: string;
  runId: string;
  model: string;
  provider: string;
}

interface Props {
  photos: { id: string; caption?: string; name?: string }[];
  categoryHint?: string;
  attributesHint?: Record<string, unknown>;
  notes?: string;
  onApplyCategory: (category: string) => void;
  onApplyField: (field: string, value: string, provenance: VisionFieldProvenance) => void;
  /** Token source (default: the real Supabase session). Injectable so the panel is testable. */
  getToken?: () => Promise<string | null | undefined>;
}

const STATE_LABEL: Record<string, string> = {
  observed: 'Seen in photos',
  probable: 'Likely',
  uncertain: 'Uncertain',
  not_visible: 'Not visible',
  user_confirmed: 'You confirmed',
  staff_confirmed: 'Staff confirmed',
  contradicted: 'Conflicts',
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

/**
 * Photo-first AI Vision intake (directive §10/§12). The seller's photos + any hints go to
 * `POST /ai/vision/intake`; the response is ADVISORY — every suggested field carries provenance
 * (confidence + evidence + state) and the seller explicitly Accepts / Edits / Rejects each one.
 * Nothing here writes an authoritative fact; accepted values flow back to the wizard draft with
 * their provenance, and the capture coach asks for the evidence the photos are missing.
 */
export function VisionIntakePanel({
  photos,
  categoryHint,
  attributesHint,
  notes,
  onApplyCategory,
  onApplyField,
  getToken = getAccessToken,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisionIntakeResult | null>(null);
  const [done, setDone] = useState<Record<string, 'applied' | 'rejected'>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const token = (await getToken()) ?? undefined;
      const images = photos.map((p, i) => ({
        // The provider is advisory (PROVIDER_GATED for real pixel analysis); it reasons over the
        // view labels + hints, so a nominal per-photo ref is sufficient and no image bytes leave.
        storageKey: `local/${p.id}`,
        view: p.caption?.trim() || (i === 0 ? 'main' : `view_${i + 1}`),
      }));
      const res = await requestVisionIntake(
        { category: categoryHint, images, attributes: attributesHint, notes },
        token,
      );
      setResult(res);
      setDone({});
      setEditing({});
    } catch (e) {
      setError(
        (e as Error)?.message?.includes('403')
          ? 'Sign in to use AI photo analysis.'
          : 'AI analysis is unavailable right now — you can fill the details in manually.',
      );
    } finally {
      setBusy(false);
    }
  }

  const provenanceFor = (f: VisionFieldSuggestion, state: string): VisionFieldProvenance => ({
    confidence: f.confidence,
    source: f.source,
    state,
    runId: result!.runId,
    model: result!.model,
    provider: result!.provider,
  });

  const missing = result?.capture.filter((c) => c.required && !c.present) ?? [];

  return (
    <div className="rounded-lg border border-white/10 bg-coal-900/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-bone-100">Analyse photos with AI</p>
          <p className="text-xs text-bone-500">
            Advisory only — Singha AI suggests details from your photos; you confirm each one.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={analyze}
          disabled={busy || photos.length === 0}
          aria-busy={busy}
        >
          {busy ? 'Analysing…' : result ? 'Re-analyse' : 'Analyse photos'}
        </Button>
      </div>

      {photos.length === 0 && (
        <p className="mt-3 text-xs text-bone-500">Add at least one photo to analyse.</p>
      )}
      {error && <p className="mt-3 text-sm text-outbid">{error}</p>}

      {result && (
        <div className="mt-4 space-y-4 text-sm">
          <p className="inline-flex items-center gap-2 rounded bg-coal-950/60 px-2 py-1 text-xs text-bone-400">
            <span aria-hidden>✦</span> Advisory draft · {result.provider}/{result.model} — never a
            fact until you confirm.
          </p>

          {result.category && result.category.value !== categoryHint && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-gold-500/30 bg-gold-500/5 p-3">
              <span>
                These photos look like <strong>{result.category.value}</strong> (
                {pct(result.category.confidence)} sure) — {result.category.source}
              </span>
              <Button variant="ghost" onClick={() => onApplyCategory(result.category!.value)}>
                Use this category
              </Button>
            </div>
          )}

          {(missing.length > 0 || result.issues.length > 0) && (
            <div className="rounded-md border border-white/10 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bone-500">
                Capture coach
              </p>
              <ul className="space-y-1 text-bone-300">
                {missing.map((c) => (
                  <li key={c.view}>
                    📷 Add a photo: <strong>{c.label}</strong>
                    {c.guidance ? ` — ${c.guidance}` : ''}
                  </li>
                ))}
                {result.issues.map((iss, i) => (
                  <li key={`${iss.kind}-${i}`} className="text-outbid">
                    ⚠ {iss.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.fields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-bone-500">
                Suggested details — accept, edit or reject each
              </p>
              {result.fields.map((f) => {
                const status = done[f.field];
                const isEditing = editing[f.field] !== undefined;
                return (
                  <div
                    key={f.field}
                    className={`rounded-md border p-3 ${
                      status === 'applied'
                        ? 'border-live/40 bg-live/5'
                        : status === 'rejected'
                          ? 'border-white/5 opacity-50'
                          : 'border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-bone-500">{f.field}: </span>
                        <span className="font-medium text-bone-100">{String(f.value ?? '—')}</span>
                        <span className="ml-2 rounded bg-coal-950/60 px-1.5 py-0.5 text-[11px] text-bone-400">
                          {STATE_LABEL[f.state] ?? f.state} · {pct(f.confidence)}
                        </span>
                      </div>
                      {!status && !isEditing && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-live hover:underline"
                            onClick={() => {
                              onApplyField(
                                f.field,
                                String(f.value ?? ''),
                                provenanceFor(f, f.state),
                              );
                              setDone((d) => ({ ...d, [f.field]: 'applied' }));
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="text-xs text-bone-300 hover:underline"
                            onClick={() =>
                              setEditing((e) => ({ ...e, [f.field]: String(f.value ?? '') }))
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs text-outbid hover:underline"
                            onClick={() => setDone((d) => ({ ...d, [f.field]: 'rejected' }))}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {status === 'applied' && <span className="text-xs text-live">✓ Added</span>}
                      {status === 'rejected' && (
                        <span className="text-xs text-bone-500">Dismissed</span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="mt-2 flex gap-2">
                        <input
                          className="flex-1 rounded border border-white/15 bg-coal-950/60 px-2 py-1 text-sm text-bone-100"
                          value={editing[f.field]}
                          onChange={(e) =>
                            setEditing((ed) => ({ ...ed, [f.field]: e.target.value }))
                          }
                          aria-label={`Edit ${f.field}`}
                        />
                        <button
                          type="button"
                          className="text-xs text-live hover:underline"
                          onClick={() => {
                            onApplyField(
                              f.field,
                              editing[f.field] ?? '',
                              provenanceFor(f, 'user_confirmed'),
                            );
                            setDone((d) => ({ ...d, [f.field]: 'applied' }));
                            setEditing((ed) => {
                              const { [f.field]: _drop, ...rest } = ed;
                              return rest;
                            });
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-bone-600">{f.source}</p>
                  </div>
                );
              })}
            </div>
          )}

          {result.valuation && (
            <div className="rounded-md border border-white/10 p-3 text-bone-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-bone-500">
                Guide value (evidence-based)
              </p>
              <p className="mt-1">
                {result.valuation.currency} {(result.valuation.lowMinor / 100).toLocaleString()} –{' '}
                {(result.valuation.highMinor / 100).toLocaleString()} (expected{' '}
                {(result.valuation.expectedMinor / 100).toLocaleString()})
              </p>
              {result.valuation.factors.length > 0 && (
                <p className="mt-1 text-xs text-bone-500">
                  Based on: {result.valuation.factors.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
