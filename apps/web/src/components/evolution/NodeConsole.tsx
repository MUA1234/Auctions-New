'use client';
import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  Chip,
  Field,
  Select,
  Skeleton,
  TextInput,
  cn,
  type ChipTone,
  type SelectOption,
} from '@singha/ui';
import { useAuth } from '../../lib/auth';
import { humanize } from '../../lib/format';
import { fetchNode, originateOnNode, type NodePresentation } from '../../lib/evolution-api';
import { StatusChip } from '../StatusChip';
import { friendlyError } from './evo-api-error';

type OriginateResult = Awaited<ReturnType<typeof originateOnNode>>;

const NODE_CAPS: SelectOption[] = [
  { value: 'listings', label: 'Originate listings' },
  { value: 'offers', label: 'Take offers' },
  { value: 'auctions', label: 'Run auctions' },
  { value: 'payments', label: 'Accept payments' },
];

const CAP_TILES: ReadonlyArray<{ key: keyof NodePresentation['capabilities']; label: string }> = [
  { key: 'browse', label: 'Browse' },
  { key: 'originateListings', label: 'Originate listings' },
  { key: 'takeOffers', label: 'Take offers' },
  { key: 'runAuctions', label: 'Run auctions' },
  { key: 'acceptPayments', label: 'Accept payments' },
];

/** ALLOWED = go, DISCOVERY_ONLY = browse-only, disabled/manual = needs attention. */
function outcomeTone(outcome: string): ChipTone {
  switch (outcome) {
    case 'ALLOWED':
      return 'win';
    case 'DISCOVERY_ONLY':
      return 'gold';
    case 'CAPABILITY_DISABLED':
    case 'MANUAL_REVIEW_REQUIRED':
      return 'outbid';
    default:
      return 'neutral';
  }
}

/**
 * Satellite Market Node console (E13, operator). Inspect a node's presentation and simulate
 * origination. A node never owns records — origination is attribution over the one central Singha
 * ledger, so the central engine always returns the authoritative outcome.
 */
export function NodeConsole() {
  const { token } = useAuth();
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState('');
  const [node, setNode] = useState<NodePresentation | null>(null);
  const [loadingNode, setLoadingNode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [capability, setCapability] = useState('listings');
  const [subjectRef, setSubjectRef] = useState('');
  const [decision, setDecision] = useState<OriginateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [originateError, setOriginateError] = useState<string | null>(null);

  async function loadNode(e: FormEvent) {
    e.preventDefault();
    const c = codeInput.trim();
    if (!c) return;
    setLoadingNode(true);
    setLoadError(null);
    setNode(null);
    setDecision(null);
    setOriginateError(null);
    try {
      const n = await fetchNode(c);
      setNode(n);
      setCode(c);
    } catch (err) {
      setLoadError(friendlyError(err));
    } finally {
      setLoadingNode(false);
    }
  }

  async function submitOriginate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setOriginateError("You don't have operator access.");
      return;
    }
    setBusy(true);
    setOriginateError(null);
    try {
      const d = await originateOnNode(code, capability, token, subjectRef.trim() || undefined);
      setDecision(d);
    } catch (err) {
      setOriginateError(friendlyError(err));
      setDecision(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Singha Evolution · Satellite nodes</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-bone">
          Satellite Market Node console
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-bone-400">
          Inspect a node's presentation and simulate origination. A node never owns records —
          origination is attribution over the one central Singha ledger.
        </p>
      </header>

      <form onSubmit={loadNode} className="mt-8 flex flex-wrap items-end gap-3">
        <Field label="Node code" className="w-full max-w-xs">
          <TextInput
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. LK"
          />
        </Field>
        <Button type="submit" variant="outline" disabled={loadingNode || !codeInput.trim()}>
          {loadingNode ? 'Loading…' : 'Load node'}
        </Button>
      </form>

      {loadError ? (
        <p className="mt-4 text-sm text-outbid" role="alert">
          {loadError}
        </p>
      ) : null}

      {loadingNode && !node ? (
        <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
      ) : node ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Node presentation */}
          <Card className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-bone-500">Node {node.code}</p>
                <h2 className="mt-1 font-serif text-2xl text-bone">{node.name}</h2>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Chip tone="gold">{humanize(node.mode)}</Chip>
                <StatusChip status={node.verification} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Preset label="Currency" value={node.presets.currency} />
              <Preset label="Language" value={node.presets.language} />
              <Preset label="Country" value={node.presets.country} />
            </div>
            <div>
              <p className="eyebrow text-bone-500">Capabilities</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CAP_TILES.map((c) => {
                  const on = node.capabilities[c.key];
                  return (
                    <Chip key={c.key} tone={on ? 'win' : 'neutral'}>
                      {on ? '✓ ' : '✕ '}
                      {c.label}
                    </Chip>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Originate */}
          <form onSubmit={submitOriginate}>
            <Card className="flex flex-col gap-4">
              <div>
                <h3 className="font-serif text-lg text-bone">Simulate origination</h3>
                <p className="mt-1 text-sm text-bone-500">
                  Attribute an action to this node. The central engine returns the authoritative
                  outcome.
                </p>
              </div>
              <Field label="Capability">
                <Select
                  options={NODE_CAPS}
                  value={capability}
                  onChange={(e) => setCapability(e.target.value)}
                />
              </Field>
              <Field
                label="Subject reference"
                hint="Optional — an existing listing/offer ref this action concerns."
              >
                <TextInput
                  value={subjectRef}
                  onChange={(e) => setSubjectRef(e.target.value)}
                  placeholder="e.g. LOT-10231"
                />
              </Field>
              {originateError ? (
                <p className="text-sm text-outbid" role="alert">
                  {originateError}
                </p>
              ) : null}
              <Button type="submit" variant="gold" disabled={busy}>
                {busy ? 'Resolving…' : 'Originate'}
              </Button>
              {decision ? <OriginateDecision decision={decision} /> : null}
            </Card>
          </form>
        </div>
      ) : (
        <Card className="mt-6 max-w-lg">
          <p className="text-sm text-bone-400">
            Enter a node code to inspect its mode, verification, market presets and capabilities.
          </p>
        </Card>
      )}
    </div>
  );
}

function Preset({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="hud-cut-xs border border-white/[0.07] bg-coal-900/50 p-2.5 text-center">
      <p className="eyebrow text-bone-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-bone-200">{value ?? '—'}</p>
    </div>
  );
}

function OriginateDecision({ decision }: { decision: OriginateResult }) {
  return (
    <div
      className={cn(
        'hud-cut-xs mt-1 border p-3',
        decision.allowed
          ? 'border-[#2fae7a]/30 bg-[#2fae7a]/[0.06]'
          : 'border-outbid/40 bg-[#e8933c]/[0.06]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={outcomeTone(decision.outcome)}>{decision.outcome.replace(/_/g, ' ')}</Chip>
        <Chip tone={decision.allowed ? 'win' : 'outbid'}>
          {decision.allowed ? 'Allowed' : 'Not allowed'}
        </Chip>
        <span className="text-xs text-bone-500">
          {humanize(decision.capability)} · node {decision.nodeCode}
        </span>
      </div>
      <p className="mt-2 text-sm text-bone-300">{decision.reason}</p>
    </div>
  );
}
