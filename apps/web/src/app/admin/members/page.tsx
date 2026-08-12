'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Chip } from '@singha/ui';
import { apiPost } from '../../../lib/api';
import {
  fetchMember360,
  grantTemporaryMembership,
  searchMembers,
  type Member360,
  type MemberSearchResult,
} from '../../../lib/member';
import { useAuth } from '../../../lib/auth';
import { formatMoney } from '../../../lib/format';
import { previewCapacityMinor, requiredSecurityBps } from '../../../lib/credit-policy';

type Tab = 'security' | 'performance' | 'flags' | 'temporary';

const INPUT =
  'w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone placeholder:text-bone-600 focus:border-red-500/40 focus:outline-none';

/**
 * Staff member operations (Revision 05 §12/§15/§17/§20). A premium operational
 * cockpit — Member 360 lookup with progressive disclosure (tabs), plus the fast
 * onsite quick-registration flow for the physical auction desk. Every binding
 * action is a server command that enforces permissions + AAL2; the UI only
 * presents them.
 */
export default function AdminMembersPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [member, setMember] = useState<Member360 | null>(null);
  const [tab, setTab] = useState<Tab>('security');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  // Search-first (§13/§14): find an existing member before ever creating one.
  useEffect(() => {
    if (!token || debounced.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    let alive = true;
    setSearching(true);
    searchMembers(token, debounced)
      .then((r) => {
        if (!alive) return;
        setResults(r.results);
        setSearched(true);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setSearching(false));
    return () => {
      alive = false;
    };
  }, [token, debounced]);

  async function open(id: string) {
    if (!token || !id) return;
    setError(null);
    try {
      setMember(await fetchMember360(token, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMember(null);
    }
  }

  if (member) {
    return (
      <div className="container-page py-14">
        <button
          onClick={() => setMember(null)}
          className="text-xs text-bone-500 hover:text-bone-300"
        >
          ← Back to search
        </button>
        <Member360Cockpit
          member={member}
          tab={tab}
          setTab={setTab}
          onReload={() => open(member.customerId)}
        />
      </div>
    );
  }

  const noMatch = searched && !searching && results.length === 0;

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Members</h1>
      <p className="mt-2 text-bone-400">
        Search an existing member by Client ID, mobile, email, name or company — or register a
        walk-in at the auction desk.
      </p>

      <div className="mt-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: CUS-000123 · 0771234567 · name@email · legal name · company"
          className={`max-w-2xl ${INPUT}`}
          autoFocus
        />
        <p className="mt-2 text-xs text-bone-500">
          {searching
            ? 'Searching…'
            : results.length
              ? `${results.length} match${results.length === 1 ? '' : 'es'} — select to open the full 360.`
              : noMatch
                ? 'No existing member matches — register a walk-in below.'
                : 'Find an existing member before creating a new one (avoids duplicates).'}
        </p>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {results.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {results.map((r) => (
            <ResultRow key={r.customerId} r={r} onOpen={() => open(r.customerId)} />
          ))}
        </ul>
      ) : null}

      <OnsiteRegistration
        token={token}
        prefillName={noMatch && /[a-z]/i.test(query) ? query.trim() : ''}
        highlight={noMatch}
        onRegistered={open}
      />
    </div>
  );
}

/** One member-search result — Client ID prominent, contact masked, quick chips. */
function ResultRow({ r, onOpen }: { r: MemberSearchResult; onOpen: () => void }) {
  const contact = [r.emailMasked, r.phoneMasked, r.organization?.legalName]
    .filter(Boolean)
    .join(' · ');
  return (
    <li>
      <button
        onClick={onOpen}
        className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-amber-300/30 hover:bg-white/[0.04]"
      >
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold tracking-wider text-amber-100">
            {r.clientReference ?? '—'}
          </p>
          <p className="truncate text-sm text-bone-200">{r.legalName ?? 'Member'}</p>
          <p className="truncate text-xs text-bone-500">{contact || '—'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {r.roles.map((role) => (
            <Chip key={role}>{role}</Chip>
          ))}
          <Chip tone={r.membershipStatus === 'active' ? 'win' : 'gold'}>{r.membershipStatus}</Chip>
          <Chip tone={r.kycStatus === 'verified' ? 'win' : 'neutral'}>KYC {r.kycStatus}</Chip>
        </div>
      </button>
    </li>
  );
}

function Member360Cockpit({
  member,
  tab,
  setTab,
  onReload,
}: {
  member: Member360;
  tab: Tab;
  setTab: (t: Tab) => void;
  onReload: () => void;
}) {
  const c = member.credit;
  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <p className="font-mono text-lg font-semibold tracking-wider text-amber-100">
            {member.clientReference ?? '—'}
          </p>
          <p className="text-bone-200">{member.legalName ?? 'Member'}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {member.roles.map((r) => (
              <Chip key={r}>{r}</Chip>
            ))}
            {member.membership ? (
              <Chip tone={member.membership.status === 'active' ? 'win' : 'gold'}>
                {member.membership.status}
              </Chip>
            ) : null}
            <Chip tone={member.kycStatus === 'verified' ? 'win' : 'neutral'}>
              KYC {member.kycStatus}
            </Chip>
            {member.organization ? <Chip>{member.organization.reference}</Chip> : null}
          </div>
        </div>
        <button
          onClick={onReload}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-bone-300 hover:border-white/20"
        >
          Refresh
        </button>
      </div>

      {/* Primary exposure cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Metric label="Approved capacity" value={formatMoney(c.approvedLimitMinor, c.currency)} />
        <Metric
          label="Committed exposure"
          value={formatMoney(c.committedMinor, c.currency)}
          muted
        />
        <Metric label="Available" value={formatMoney(c.availableMinor, c.currency)} accent />
        <Metric
          label="Verified security"
          value={formatMoney(
            member.security
              .filter((s) => s.status === 'verified' || s.status === 'active')
              .reduce((sum, s) => sum + s.eligibleAmountMinor, 0),
            c.currency,
          )}
        />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-white/10">
        {(['security', 'performance', 'flags', 'temporary'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t
                ? 'border-b-2 border-amber-300 text-bone'
                : 'text-bone-400 hover:text-bone-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'security' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {member.security.length === 0 ? (
              <p className="text-sm text-bone-500">No security instruments.</p>
            ) : (
              member.security.map((s) => (
                <Card key={s.id}>
                  <p className="text-[11px] uppercase tracking-wider text-bone-500">
                    {s.type.replace(/_/g, ' ')}
                  </p>
                  {s.issuingBank ? <p className="text-sm text-bone-200">{s.issuingBank}</p> : null}
                  <p className="mt-1 text-base font-semibold text-bone">
                    {formatMoney(s.faceAmountMinor, s.currency)}
                  </p>
                  <p className="text-xs text-bone-500">
                    eligible {formatMoney(s.eligibleAmountMinor, s.currency)} · {s.status}
                  </p>
                  {s.expiresAt ? (
                    <p className="text-xs text-bone-500">
                      expires {new Date(s.expiresAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </Card>
              ))
            )}
          </div>
        ) : tab === 'performance' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {member.performance.length === 0 ? (
              <p className="text-sm text-bone-500">No performance snapshots yet.</p>
            ) : (
              member.performance.map((p, i) => (
                <Card key={i}>
                  <p className="text-[11px] uppercase tracking-wider text-bone-500 capitalize">
                    {p.context} performance
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-bone">
                    {p.score == null ? 'Insufficient history' : `${p.score} / 100`}
                  </p>
                  <p className="text-xs text-bone-500">
                    {p.band} · {p.ruleVersion}
                  </p>
                </Card>
              ))
            )}
          </div>
        ) : tab === 'flags' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {member.flags.length === 0 ? (
              <p className="text-sm text-bone-500">No flags on file.</p>
            ) : (
              member.flags.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-lg border p-3 ${
                    f.severity === 'critical' || f.severity === 'high'
                      ? 'border-red-400/25'
                      : 'border-white/10'
                  } bg-white/[0.02]`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-bone">{f.title}</p>
                    <Chip tone={f.status === 'resolved' ? 'win' : 'neutral'}>{f.status}</Chip>
                  </div>
                  <p className="mt-1 text-xs text-bone-500 capitalize">
                    {f.category} · {f.severity} · {f.reasonCode}
                  </p>
                  {f.privateNote ? (
                    <p className="mt-1 text-xs text-bone-400">{f.privateNote}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {member.temporaryAccess.length === 0 ? (
              <p className="text-sm text-bone-500">No temporary access grants.</p>
            ) : (
              member.temporaryAccess.map((t, i) => (
                <Card key={i}>
                  <p className="text-sm text-bone-200 capitalize">{t.scopeType} access</p>
                  {t.scopeId ? <p className="text-xs text-bone-500">{t.scopeId}</p> : null}
                  {t.expiresAt ? (
                    <p className="text-xs text-bone-500">
                      until {new Date(t.expiresAt).toLocaleString()}
                    </p>
                  ) : null}
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Onsite registration (Revision 06.2 §14) — reached only AFTER search finds no
 * match. Identity (name + mobile/email) → Buyer/Seller/Both → spot deposit →
 * EXPLICIT scope (Auction/Event/Platform — blank never silently means platform)
 * → backend calculates temporary capacity → passport. KYC is never faked verified.
 */
function OnsiteRegistration({
  token,
  prefillName,
  highlight,
  onRegistered,
}: {
  token: string | null;
  prefillName: string;
  highlight: boolean;
  onRegistered: (customerId: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller' | 'both'>('buyer');
  const [deposit, setDeposit] = useState('50000');
  const [hours, setHours] = useState('8');
  const [scopeType, setScopeType] = useState<'event' | 'auction' | 'platform'>('event');
  const [scopeId, setScopeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ clientId: string; capacity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search-first: seed the name from the query when no existing member matched.
  useEffect(() => {
    if (prefillName) setName((n) => n || prefillName);
  }, [prefillName]);

  const depositMinor = Math.round(Number(deposit || '0') * 100);
  const bps = requiredSecurityBps();
  const needsScopeId = scopeType !== 'platform';

  async function register() {
    if (!token) return setError('Sign in as staff first.');
    if (!name.trim()) return setError('Name is required.');
    if (!email.trim() && !phone.trim())
      return setError('Add a mobile or email so the member can be found later.');
    if (needsScopeId && !scopeId.trim())
      return setError(`Enter the ${scopeType} ID for a scoped grant.`);
    setBusy(true);
    setError(null);
    try {
      const customer = await apiPost<{ id: string; clientReference: string }>(
        '/customers',
        {
          legalName: name.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
        token,
      );
      const expiresAt = new Date(Date.now() + Number(hours) * 3_600_000).toISOString();
      const grant = await grantTemporaryMembership(token, {
        customerId: customer.id,
        scopeType,
        scopeId: needsScopeId ? scopeId.trim() : undefined,
        spotDepositMinor: depositMinor,
        requiredSecurityBps: bps,
        expiresAt,
        reason: `Onsite registration desk · ${role} · KYC pending`,
      });
      const capacity = (grant as { approvedLimitMinor?: number }).approvedLimitMinor ?? 0;
      setResult({ clientId: customer.clientReference, capacity });
      onRegistered(customer.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={`mt-8 max-w-xl ${highlight ? 'border-amber-300/30' : ''}`}>
      <h2 className="font-display text-sm font-semibold text-bone">
        {highlight ? 'No match — register this walk-in' : 'Register a walk-in'}
      </h2>
      <p className="mt-1 text-xs text-bone-500">
        Create only after searching. Identity, spot deposit and an explicit scope, then a temporary
        passport. KYC stays pending until Singha verifies it.
      </p>
      <div className="mt-4 space-y-3">
        <Field label="Legal / person / company name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="0771234567"
              className={INPUT}
            />
          </Field>
          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              placeholder="name@email"
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="Acting as">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'buyer' | 'seller' | 'both')}
            className={INPUT}
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Spot deposit (LKR)">
            <input
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              inputMode="numeric"
              className={INPUT}
            />
          </Field>
          <Field label="Valid for (hours)">
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputMode="numeric"
              className={INPUT}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Access scope">
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as 'event' | 'auction' | 'platform')}
              className={INPUT}
            >
              <option value="auction">Auction — this auction</option>
              <option value="event">Event — this event</option>
              <option value="platform">Platform — all (needs authority)</option>
            </select>
          </Field>
          {needsScopeId ? (
            <Field label={`${scopeType === 'auction' ? 'Auction' : 'Event'} ID`}>
              <input
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className={INPUT}
              />
            </Field>
          ) : (
            <div className="flex items-end pb-2">
              <p className="text-xs text-amber-300/80">Platform-wide — use only with authority.</p>
            </div>
          )}
        </div>
        {/* Non-authoritative preview from the configured policy (§16). */}
        <p className="text-xs text-bone-500">
          At {(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%, a {formatMoney(depositMinor)} deposit
          ≈{' '}
          <span className="text-amber-100">
            {formatMoney(previewCapacityMinor(depositMinor, bps))}
          </span>{' '}
          capacity — final on Singha verification.
        </p>
        <Button onClick={register} disabled={busy || !name.trim()}>
          {busy ? 'Registering…' : 'Register & issue passport'}
        </Button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {result ? (
          <div className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-3">
            <p className="text-xs uppercase tracking-widest text-bone-500">Issued</p>
            <p className="font-mono text-lg text-amber-100">{result.clientId}</p>
            <p className="text-sm text-bone-200">
              Temporary capacity {formatMoney(result.capacity)}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-bone-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          accent ? 'text-amber-100' : muted ? 'text-bone-300' : 'text-bone'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-bone-400">{label}</span>
      {children}
    </label>
  );
}
