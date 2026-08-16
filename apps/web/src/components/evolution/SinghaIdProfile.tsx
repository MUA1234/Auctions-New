'use client';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Button, Card, Chip, Field, Select, Skeleton, TextInput } from '@singha/ui';
import { SignInPrompt } from '../../components/SignInPrompt';
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
import { friendlyMessage } from './evo-api-error';
import {
  capabilityHint,
  capabilityLabel,
  passportNextStep,
  passportState,
  PassportStateChip,
} from './capability-state';

/**
 * Singha ID — the customer's transaction passport (CX7, pack doc 05/11). One identity across
 * buying, selling, logistics and verification, presented as passport-style sections (Identity /
 * Company / Seller readiness / Bidder & buyer readiness / Trade capabilities & licences), each
 * with a plain state (Verified / Under review / Action needed / Not started) and, where action is
 * needed, a plain next step. The profile sections edit presentation/preference fields (never a
 * binding transaction currency — D5); the capability sections show each grant's status and let the
 * customer request one, which an operator later reviews. Authorization is enforced on the server —
 * this surface only requests and reflects state, it never grants anything, and it never shows an
 * internal risk score, staff note, raw capability enum code or private evidence — only the
 * customer-safe state the backend already returns, mapped to a friendly label (`capability-state`).
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

// The dropdown intentionally uses the generic `humanize()` label (not `capabilityLabel()`) so
// every capability keeps one plain, literal name in the one place a customer picks from a list.
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

/** One passport section: a titled card with an optional top-right state badge. */
function PassportCard({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-bone">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-bone-500">{description}</p>
          ) : null}
        </div>
        {badge}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

interface RowFeedback {
  capability: string;
  kind: 'note' | 'error';
  text: string;
}

/** One capability's passport row: state, plain next step, expiry (if any), and a request action. */
function CapabilityRow({
  capability,
  grant,
  busy,
  feedback,
  onRequest,
}: {
  capability: string;
  grant: CapabilityGrant | undefined;
  busy: boolean;
  feedback: RowFeedback | null;
  onRequest: (capability: string) => void;
}) {
  const state = passportState(grant?.status, grant?.expiresAt);
  const label = capabilityLabel(capability);
  const canRequest = state === 'none' || state === 'action';
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-bone-200">{label}</p>
          <p className="mt-0.5 max-w-md text-xs text-bone-500">{capabilityHint(capability)}</p>
        </div>
        <PassportStateChip state={state} />
      </div>
      <p className="mt-2 text-xs text-bone-400">{passportNextStep(state, label)}</p>
      {grant?.expiresAt ? (
        <p className="mt-1 text-xs text-bone-500">Expires {formatDate(grant.expiresAt)}</p>
      ) : null}
      {canRequest ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 px-3 py-1.5 text-xs"
          disabled={busy}
          aria-label={state === 'action' ? `Request ${label} again` : `Request ${label} access`}
          onClick={() => onRequest(capability)}
        >
          {busy ? 'Sending…' : state === 'action' ? 'Request again' : 'Request access'}
        </Button>
      ) : null}
      {feedback ? (
        <p className={`mt-2 text-xs ${feedback.kind === 'error' ? 'text-outbid' : 'text-red-300'}`}>
          {feedback.text}
        </p>
      ) : null}
    </li>
  );
}

export function SinghaIdProfile() {
  const { token, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [caps, setCaps] = useState<CapabilityGrant[]>([]);
  const [evalHint, setEvalHint] = useState<CapabilityDecision | null>(null);

  // Profile save state.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Request-verification state (generic bottom form).
  const [requestCap, setRequestCap] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState<string | null>(null);

  // Request-verification state (per-capability passport row buttons).
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowFeedback, setRowFeedback] = useState<RowFeedback | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;
    let alive = true;
    setStatus('loading');
    setLoadError(null);
    Promise.all([fetchSinghaProfile(token), fetchCapabilities(token)])
      .then(([profile, grants]) => {
        if (!alive) return;
        setForm(fromProfile(profile));
        setCaps(grants);
        setStatus('idle');
      })
      .catch((err: unknown) => {
        if (alive) {
          setStatus('error');
          setLoadError(friendlyMessage(err, "We couldn't load your Singha ID."));
        }
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
      setSaveError(friendlyMessage(err, 'Could not save your profile.'));
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
      setRequestError(friendlyMessage(err, 'Could not send the request.'));
    } finally {
      setRequesting(false);
    }
  }

  async function requestOne(capability: string) {
    if (!token) return;
    setRowBusy(capability);
    setRowFeedback(null);
    try {
      const result = await requestCapability(capability, token);
      setRowFeedback({
        capability,
        kind: 'note',
        text: `Requested — an operator will review it. Current status: ${humanize(result.status)}.`,
      });
      const fresh = await fetchCapabilities(token);
      setCaps(fresh);
    } catch (err) {
      setRowFeedback({
        capability,
        kind: 'error',
        text: friendlyMessage(err, 'Could not send the request.'),
      });
    } finally {
      setRowBusy(null);
    }
  }

  if (!authLoading && !token)
    return (
      <SignInPrompt
        title="Your Singha ID"
        description="Sign in to see your transaction passport and manage verification."
        next="/account/singha-id"
      />
    );

  const grantByCap = new Map(caps.map((c) => [c.capability, c] as const));
  const rowFeedbackFor = (cap: string) =>
    rowFeedback && rowFeedback.capability === cap ? rowFeedback : null;

  const identityComplete = Boolean(form.countryResidency.trim() && form.language.trim());
  const companyComplete = form.companyRoles.trim().length > 0;

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Singha ID</p>
        <h1 className="mt-1 font-serif text-3xl text-bone">Your transaction passport</h1>
        <p className="mt-2 max-w-2xl text-bone-400">
          One identity across buying, selling, logistics and verification — the passport Singha and
          your counterparties check before a deal goes ahead.
        </p>
      </header>

      {status === 'loading' ? (
        <div className="mt-8 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-6 w-48" />
              <div className="mt-5 space-y-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </Card>
          ))}
        </div>
      ) : status === 'error' ? (
        <Card className="mt-8 py-10 text-center">
          <p className="text-bone-300">{loadError ?? "We couldn't load your Singha ID."}</p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Identity + Company ------------------------------------------------- */}
          <form onSubmit={saveProfile} className="space-y-6">
            <PassportCard
              title="Identity"
              description="Presentation and preference settings for your account."
              badge={
                <Chip tone={identityComplete ? 'win' : 'neutral'}>
                  {identityComplete ? 'Complete' : 'Add your details'}
                </Chip>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </PassportCard>

            <PassportCard
              title="Company"
              description="How you trade — shown to Singha staff and counterparties."
              badge={
                <Chip tone={companyComplete ? 'win' : 'neutral'}>
                  {companyComplete ? 'Complete' : 'Not started'}
                </Chip>
              }
            >
              <Field
                label="Company roles"
                htmlFor="roles"
                hint="Comma-separated, e.g. buyer, seller."
              >
                <TextInput
                  id="roles"
                  value={form.companyRoles}
                  onChange={(e) => set('companyRoles', e.target.value)}
                  placeholder="buyer, seller"
                />
              </Field>
            </PassportCard>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="gold" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
              {saved ? <span className="text-sm text-red-300">Saved.</span> : null}
              {saveError ? <span className="text-sm text-outbid">{saveError}</span> : null}
            </div>
          </form>

          {/* Seller readiness ---------------------------------------------------- */}
          <PassportCard
            title="Seller readiness"
            description="What you need to list items for sale on Singha."
          >
            <ul className="divide-y divide-white/[0.06]">
              <CapabilityRow
                capability="sell"
                grant={grantByCap.get('sell')}
                busy={rowBusy === 'sell'}
                feedback={rowFeedbackFor('sell')}
                onRequest={requestOne}
              />
            </ul>
          </PassportCard>

          {/* Bidder & buyer readiness --------------------------------------------- */}
          <PassportCard
            title="Bidder & buyer readiness"
            description="What you need to bid and make offers on Singha."
          >
            {evalHint ? (
              <p className="mb-4 hud-cut-xs border border-white/[0.06] bg-coal-900/40 px-3 py-2 text-xs text-bone-400">
                {evalHint.permitted
                  ? 'Bidding: you are cleared to place bids right now.'
                  : `Bidding: not available yet — ${humanize(evalHint.reason)}.`}
              </p>
            ) : null}
            <ul className="divide-y divide-white/[0.06]">
              {(['place_bid', 'make_offer'] as const).map((cap) => (
                <CapabilityRow
                  key={cap}
                  capability={cap}
                  grant={grantByCap.get(cap)}
                  busy={rowBusy === cap}
                  feedback={rowFeedbackFor(cap)}
                  onRequest={requestOne}
                />
              ))}
            </ul>
          </PassportCard>

          {/* Trade capabilities & licences ----------------------------------------- */}
          <PassportCard
            title="Trade capabilities & licences"
            description="Specialised capabilities for running auctions and cross-border or high-value trade."
          >
            <ul className="divide-y divide-white/[0.06]">
              {(['operate_auction', 'export', 'import', 'high_value_trade'] as const).map((cap) => (
                <CapabilityRow
                  key={cap}
                  capability={cap}
                  grant={grantByCap.get(cap)}
                  busy={rowBusy === cap}
                  feedback={rowFeedbackFor(cap)}
                  onRequest={requestOne}
                />
              ))}
            </ul>
          </PassportCard>

          {/* Generic catch-all request form ----------------------------------------- */}
          <Card>
            <h2 className="font-serif text-xl text-bone">Request another capability</h2>
            <p className="mt-1 max-w-2xl text-sm text-bone-500">
              Choose any capability above and send a request — an operator reviews it.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
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
          </Card>
        </div>
      )}
    </div>
  );
}
