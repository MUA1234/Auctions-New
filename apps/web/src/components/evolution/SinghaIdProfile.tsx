'use client';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, Card, Chip, Field, Select, Skeleton, TextInput } from '@singha/ui';
import { SignInPrompt } from '../../components/SignInPrompt';
import { StatusChip } from '../../components/StatusChip';
import { useAuth } from '../../lib/auth';
import { CURRENCIES, formatDate, humanize } from '../../lib/format';
import {
  type CapabilityDecision,
  type CapabilityGrant,
  type SinghaProfile,
  evaluateCapability,
  fetchCapabilities,
  fetchSinghaProfile,
  requestCapability,
  updateSinghaProfile,
} from '../../lib/evolution-api';

/**
 * Unified Singha ID profile + verification (E11). One identity across buying, selling, logistics
 * and verification. The profile section edits presentation/preference fields (never a binding
 * transaction currency — D5); the verification section shows each capability's status and lets the
 * customer request one, which an operator later reviews. Authorization is enforced on the server —
 * this surface only requests and reflects state, it never grants anything.
 */

const CAPABILITIES = [
  'place_bid',
  'make_offer',
  'sell',
  'operate_auction',
  'export',
  'import',
  'high_value_trade',
] as const;

const CAP_OPTIONS = CAPABILITIES.map((c) => ({ value: c, label: humanize(c) }));
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: c.label }));

interface FormState {
  countryResidency: string;
  displayCurrency: string;
  language: string;
  timezone: string;
  companyRoles: string;
}

const EMPTY_FORM: FormState = {
  countryResidency: '',
  displayCurrency: '',
  language: '',
  timezone: '',
  companyRoles: '',
};

function fromProfile(p: SinghaProfile): FormState {
  return {
    countryResidency: p.countryResidency ?? '',
    displayCurrency: p.displayCurrency ?? '',
    language: p.language ?? '',
    timezone: p.timezone ?? '',
    companyRoles: p.companyRoles.join(', '),
  };
}

export function SinghaIdProfile() {
  const { token, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [caps, setCaps] = useState<CapabilityGrant[]>([]);
  const [evalHint, setEvalHint] = useState<CapabilityDecision | null>(null);

  // Profile save state.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Request-verification state.
  const [requestCap, setRequestCap] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;
    let alive = true;
    setStatus('loading');
    Promise.all([fetchSinghaProfile(token), fetchCapabilities(token)])
      .then(([profile, grants]) => {
        if (!alive) return;
        setForm(fromProfile(profile));
        setCaps(grants);
        setStatus('idle');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    // Optional, non-fatal hint: is bidding currently permitted?
    evaluateCapability('place_bid', token)
      .then((decision) => {
        if (alive) setEvalHint(decision);
      })
      .catch(() => {
        /* evaluation unavailable — hide the hint, never break the surface */
      });
    return () => {
      alive = false;
    };
  }, [token, authLoading, reloadKey]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateSinghaProfile(
        {
          countryResidency: form.countryResidency.trim() || null,
          displayCurrency: form.displayCurrency || null,
          language: form.language.trim() || null,
          timezone: form.timezone.trim() || null,
          companyRoles: form.companyRoles
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        token,
      );
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function submitRequest() {
    if (!token || !requestCap) return;
    setRequesting(true);
    setRequestError(null);
    setRequestNote(null);
    try {
      const result = await requestCapability(requestCap, token);
      setRequestNote(
        `Requested ${humanize(result.capability)} — an operator will review it. Current status: ${result.status}.`,
      );
      setRequestCap('');
      const fresh = await fetchCapabilities(token);
      setCaps(fresh);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Could not send the request.');
    } finally {
      setRequesting(false);
    }
  }

  if (!authLoading && !token)
    return (
      <SignInPrompt
        title="Your Singha ID"
        description="Sign in to manage your unified profile and verification."
        next="/account/singha-id"
      />
    );

  const grantByCap = new Map(caps.map((c) => [c.capability, c] as const));

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Singha ID</p>
        <h1 className="mt-1 font-serif text-3xl text-bone">Your unified profile</h1>
        <p className="mt-2 max-w-2xl text-bone-400">
          One identity across buying, selling, logistics and verification. Your preferences shape
          how Singha shows prices, dates and language — they never change a binding transaction
          currency.
        </p>
      </header>

      {status === 'loading' ? (
        <div className="mt-8 space-y-8">
          <Card>
            <Skeleton className="h-6 w-40" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </Card>
          <Card>
            <Skeleton className="h-6 w-56" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          </Card>
        </div>
      ) : status === 'error' ? (
        <Card className="mt-8 py-10 text-center">
          <p className="text-bone-300">We couldn&rsquo;t load your Singha ID.</p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Profile ------------------------------------------------------------ */}
          <Card>
            <h2 className="font-serif text-xl text-bone">Profile</h2>
            <p className="mt-1 text-sm text-bone-500">
              Presentation and preference settings for your account.
            </p>
            <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Country of residency" htmlFor="cr">
                <TextInput
                  id="cr"
                  value={form.countryResidency}
                  onChange={(e) => set('countryResidency', e.target.value)}
                  placeholder="e.g. LK"
                />
              </Field>
              <Field
                label="Display currency"
                htmlFor="dc"
                hint="Informational only — never a binding currency."
              >
                <Select
                  id="dc"
                  options={CURRENCY_OPTIONS}
                  placeholder="Native currency"
                  value={form.displayCurrency}
                  onChange={(e) => set('displayCurrency', e.target.value)}
                />
              </Field>
              <Field label="Language" htmlFor="lang">
                <TextInput
                  id="lang"
                  value={form.language}
                  onChange={(e) => set('language', e.target.value)}
                  placeholder="e.g. en"
                />
              </Field>
              <Field label="Timezone" htmlFor="tz">
                <TextInput
                  id="tz"
                  value={form.timezone}
                  onChange={(e) => set('timezone', e.target.value)}
                  placeholder="e.g. Asia/Colombo"
                />
              </Field>
              <Field
                className="sm:col-span-2"
                label="Company roles"
                htmlFor="roles"
                hint="Comma-separated, e.g. buyer, seller, operator."
              >
                <TextInput
                  id="roles"
                  value={form.companyRoles}
                  onChange={(e) => set('companyRoles', e.target.value)}
                  placeholder="buyer, seller"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" variant="gold" disabled={saving}>
                  {saving ? 'Saving…' : 'Save profile'}
                </Button>
                {saved ? <span className="text-sm text-red-300">Saved.</span> : null}
                {saveError ? <span className="text-sm text-outbid">{saveError}</span> : null}
              </div>
            </form>
          </Card>

          {/* Verification / capabilities -------------------------------------- */}
          <Card>
            <h2 className="font-serif text-xl text-bone">Verification &amp; capabilities</h2>
            <p className="mt-1 max-w-2xl text-sm text-bone-500">
              You can browse freely; some activities (bidding, selling, export/import, high-value
              trade) require a verified capability. Request one and an operator reviews it.
            </p>

            {evalHint ? (
              <p className="mt-3 hud-cut-xs border border-white/[0.06] bg-coal-900/40 px-3 py-2 text-xs text-bone-400">
                {evalHint.permitted
                  ? 'Bidding: you are cleared to place bids right now.'
                  : `Bidding: not available yet — ${humanize(evalHint.reason)}.`}
              </p>
            ) : null}

            <ul className="mt-4 divide-y divide-white/[0.06]">
              {CAPABILITIES.map((cap) => {
                const grant = grantByCap.get(cap);
                return (
                  <li key={cap} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-bone-200">{humanize(cap)}</p>
                      {grant?.expiresAt ? (
                        <p className="text-xs text-bone-500">
                          Expires {formatDate(grant.expiresAt)}
                        </p>
                      ) : null}
                    </div>
                    {grant && grant.status !== 'none' ? (
                      <StatusChip status={grant.status} />
                    ) : (
                      <Chip tone="neutral">Not requested</Chip>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <p className="text-sm font-medium text-bone-200">Request verification</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <span className="mb-1 block text-sm text-bone-400">Request a capability</span>
                  <Select
                    aria-label="Request a capability"
                    options={CAP_OPTIONS}
                    placeholder="Choose a capability"
                    value={requestCap}
                    onChange={(e) => {
                      setRequestCap(e.target.value);
                      setRequestError(null);
                      setRequestNote(null);
                    }}
                  />
                </div>
                <Button type="button" onClick={submitRequest} disabled={!requestCap || requesting}>
                  {requesting ? 'Requesting…' : 'Request verification'}
                </Button>
              </div>
              {requestNote ? <p className="mt-3 text-sm text-red-300">{requestNote}</p> : null}
              {requestError ? <p className="mt-3 text-sm text-outbid">{requestError}</p> : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
