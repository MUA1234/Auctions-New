'use client';

import { useState } from 'react';
import { Button, Card, Chip } from '@singha/ui';
import { apiPost } from '../../../lib/api';
import { fetchMember360, grantTemporaryMembership, type Member360 } from '../../../lib/member';
import { useAuth } from '../../../lib/auth';
import { formatMoney } from '../../../lib/format';

type Tab = 'security' | 'performance' | 'flags' | 'temporary';

/**
 * Staff member operations (Revision 05 §12/§15/§17/§20). A premium operational
 * cockpit — Member 360 lookup with progressive disclosure (tabs), plus the fast
 * onsite quick-registration flow for the physical auction desk. Every binding
 * action is a server command that enforces permissions + AAL2; the UI only
 * presents them.
 */
export default function AdminMembersPage() {
  const { token } = useAuth();
  const [lookupId, setLookupId] = useState('');
  const [member, setMember] = useState<Member360 | null>(null);
  const [tab, setTab] = useState<Tab>('security');
  const [error, setError] = useState<string | null>(null);

  async function load(id: string) {
    if (!token || !id) return;
    setError(null);
    try {
      setMember(await fetchMember360(token, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMember(null);
    }
  }

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Members</h1>
      <p className="mt-2 text-bone-400">
        Look up a member for the full 360, or register a walk-in at the auction desk.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          placeholder="Customer ID (ULID)"
          className="w-80 rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone placeholder:text-bone-600 focus:border-red-500/40 focus:outline-none"
        />
        <Button onClick={() => load(lookupId)}>Open Member 360</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {member ? (
        <Member360Cockpit
          member={member}
          tab={tab}
          setTab={setTab}
          onReload={() => load(member.customerId)}
        />
      ) : (
        <OnsiteRegistration
          token={token}
          onRegistered={(id) => {
            setLookupId(id);
            void load(id);
          }}
        />
      )}
    </div>
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
 * Onsite quick registration (§15) — Search/Create → Identity → spot deposit →
 * calculate temporary capacity → event/expiry → confirm → passport. Kept to a
 * few fast fields for the tablet at the registration desk.
 */
function OnsiteRegistration({
  token,
  onRegistered,
}: {
  token: string | null;
  onRegistered: (customerId: string) => void;
}) {
  const [name, setName] = useState('');
  const [deposit, setDeposit] = useState('50000');
  const [scopeId, setScopeId] = useState('');
  const [hours, setHours] = useState('8');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ clientId: string; capacity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function register() {
    if (!token) {
      setError('Sign in as staff first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const customer = await apiPost<{ id: string; clientReference: string }>(
        '/customers',
        { legalName: name },
        token,
      );
      const expiresAt = new Date(Date.now() + Number(hours) * 3_600_000).toISOString();
      const grant = await grantTemporaryMembership(token, {
        customerId: customer.id,
        scopeType: scopeId ? 'event' : 'platform',
        scopeId: scopeId || undefined,
        spotDepositMinor: Math.round(Number(deposit) * 100),
        requiredSecurityBps: 500,
        expiresAt,
        reason: 'Onsite registration desk',
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
    <Card className="mt-8 max-w-xl">
      <h2 className="font-display text-sm font-semibold text-bone">Onsite quick registration</h2>
      <p className="mt-1 text-xs text-bone-500">
        Register a walk-in bidder against a spot deposit and issue temporary access.
      </p>
      <div className="mt-4 space-y-3">
        <Field label="Name / company">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone focus:border-red-500/40 focus:outline-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Spot deposit (LKR)">
            <input
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone focus:border-red-500/40 focus:outline-none"
            />
          </Field>
          <Field label="Valid for (hours)">
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone focus:border-red-500/40 focus:outline-none"
            />
          </Field>
        </div>
        <Field label="Event ID (optional — blank = platform-wide)">
          <input
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone focus:border-red-500/40 focus:outline-none"
          />
        </Field>
        {/* Calculated capacity preview at the default 5% ratio. */}
        <p className="text-xs text-bone-500">
          At 5%, a {formatMoney(Math.round(Number(deposit || '0') * 100))} deposit ≈{' '}
          <span className="text-amber-100">
            {formatMoney(Math.round(Number(deposit || '0') * 100) * 20)}
          </span>{' '}
          bid capacity.
        </p>
        <Button onClick={register} disabled={busy || !name}>
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
