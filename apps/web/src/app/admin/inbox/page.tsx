'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Chip } from '@singha/ui';
import {
  assignConversation,
  fetchConversation,
  fetchInbox,
  resolveConversation,
  sendMessage,
  suggestReply,
  type ConversationDetail,
  type InboxFilters,
  type InboxRow,
} from '../../../lib/inbox';
import { useAuth } from '../../../lib/auth';
import { StaffNav } from '../../../components/StaffNav';

const INPUT =
  'w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone placeholder:text-bone-600 focus:border-red-500/40 focus:outline-none';

const STATUS_TONE: Record<string, 'win' | 'gold' | 'neutral'> = {
  open: 'gold',
  pending: 'neutral',
  resolved: 'win',
  closed: 'neutral',
};

/**
 * Singha Connect — Agent Inbox (CRM completion pass §4). The staff conversation queue with channel
 * / status / awaiting-reply filters and an SLA signal, plus a conversation workspace: assign,
 * resolve, an ADVISORY AI reply suggestion (drafts only — the agent sends explicitly), and send.
 * connect:operate is enforced server-side; a token without it gets a 403 surfaced inline.
 */
export default function AgentInboxPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<InboxFilters>({ awaitingReply: undefined });
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: string, f: InboxFilters) => {
    setLoading(true);
    try {
      const res = await fetchInbox(t, { ...f, limit: 50 });
      setRows(res.conversations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token, filters);
  }, [token, filters, load]);

  if (openId && token) {
    return (
      <div className="container-page py-14">
        <button
          onClick={() => {
            setOpenId(null);
            void load(token, filters);
          }}
          className="text-xs text-bone-500 hover:text-bone-300"
        >
          ← Back to inbox
        </button>
        <ConversationWorkspace id={openId} />
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <StaffNav active="/admin/inbox" />
      <h1 className="mt-6 font-serif text-4xl font-bold text-bone">Agent Inbox</h1>
      <p className="mt-2 text-bone-400">
        Every customer conversation across channels, in one queue. Threads waiting on a reply rise
        to the top.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        <select
          value={filters.channel ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value || undefined }))}
          className={`w-40 ${INPUT}`}
        >
          <option value="">All channels</option>
          {['web', 'whatsapp', 'facebook', 'instagram', 'email', 'sms'].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value || undefined) as InboxFilters['status'],
            }))
          }
          className={`w-40 ${INPUT}`}
        >
          <option value="">Any status</option>
          {['open', 'pending', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            setFilters((f) => ({ ...f, awaitingReply: f.awaitingReply ? undefined : true }))
          }
          className={`rounded-md border px-3 py-2 text-sm ${
            filters.awaitingReply
              ? 'border-amber-300/40 text-amber-100'
              : 'border-white/10 text-bone-300 hover:border-white/20'
          }`}
        >
          Awaiting reply
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, unassigned: f.unassigned ? undefined : true }))}
          className={`rounded-md border px-3 py-2 text-sm ${
            filters.unassigned
              ? 'border-amber-300/40 text-amber-100'
              : 'border-white/10 text-bone-300 hover:border-white/20'
          }`}
        >
          Unassigned
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-6 grid gap-2">
        {loading && rows.length === 0 ? (
          <p className="text-sm text-bone-500">Loading…</p>
        ) : rows.length === 0 ? (
          <Card>
            <p className="text-sm text-bone-400">No conversations match.</p>
          </Card>
        ) : (
          rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenId(r.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-amber-300/30 hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <p className="text-sm text-bone-200">
                  {r.lastMessagePreview ?? <span className="text-bone-500">No messages</span>}
                </p>
                <p className="mt-0.5 text-xs text-bone-500">
                  {r.channel}
                  {r.customerId ? ` · ${r.customerId.slice(0, 10)}…` : ' · unresolved'}
                  {r.assignedAgentId ? ` · ${r.assignedAgentId}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {r.waitingOnStaff ? (
                  <Chip tone="gold">
                    waiting{r.waitingMinutes != null ? ` ${r.waitingMinutes}m` : ''}
                  </Chip>
                ) : null}
                {r.aiMode ? <Chip tone="neutral">AI</Chip> : <Chip tone="neutral">human</Chip>}
                <Chip tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Chip>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ConversationWorkspace({ id }: { id: string }) {
  const { token } = useAuth();
  const [convo, setConvo] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (t: string) => {
      try {
        setConvo(await fetchConversation(t, id));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [id],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function run(key: string, fn: () => Promise<unknown>) {
    if (!token) return;
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (error && !convo) return <p className="mt-6 text-sm text-red-300">{error}</p>;
  if (!convo) return <p className="mt-6 text-sm text-bone-500">Loading conversation…</p>;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <p className="text-bone-200">
            {convo.channel}
            {convo.customerId ? ` · ${convo.customerId}` : ' · unresolved'}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Chip tone={STATUS_TONE[convo.status] ?? 'neutral'}>{convo.status}</Chip>
            {convo.aiMode ? <Chip>AI mode</Chip> : <Chip>human</Chip>}
            {convo.assignedAgentId ? <Chip>{convo.assignedAgentId}</Chip> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              run('assign', () => assignConversation(token!, id).then(() => load(token!)))
            }
            disabled={busy === 'assign'}
          >
            Assign to me
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              run('resolve', () => resolveConversation(token!, id).then(() => load(token!)))
            }
            disabled={busy === 'resolve' || convo.status === 'resolved'}
          >
            Resolve
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="mt-4 grid gap-2">
        {convo.messages.length === 0 ? (
          <p className="text-sm text-bone-500">No messages.</p>
        ) : (
          convo.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.direction === 'inbound'
                  ? 'self-start border border-white/10 bg-white/[0.03] text-bone-200'
                  : 'self-end bg-amber-300/10 text-bone'
              }`}
            >
              <p>{m.text}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-bone-600">
                {m.provenance} · {new Date(m.createdAt).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* AI suggestion (advisory) + send */}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-bone-500">Reply</p>
          <button
            onClick={() =>
              run('suggest', async () => {
                const s = await suggestReply(token!, id);
                setSuggestion(s.suggestion);
                if (!s.blocked) setDraft(s.suggestion);
              })
            }
            disabled={busy === 'suggest'}
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-amber-100 hover:border-amber-300/30 disabled:opacity-50"
          >
            {busy === 'suggest' ? 'Drafting…' : '✨ Suggest reply (AI)'}
          </button>
        </div>
        {suggestion ? (
          <p className="mb-2 rounded-md border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-bone-400">
            AI draft — review before sending. Nothing is sent until you press Send.
          </p>
        ) : null}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Type a reply…"
          className={INPUT}
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={() =>
              run('send', async () => {
                await sendMessage(token!, id, draft.trim());
                setDraft('');
                setSuggestion(null);
                await load(token!);
              })
            }
            disabled={busy === 'send' || !draft.trim()}
          >
            {busy === 'send' ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
