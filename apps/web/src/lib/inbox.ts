import { apiGetAuthed, apiPost } from './api';

/**
 * Singha Connect Agent Inbox client (CRM completion pass §4) — the staff conversation queue.
 * Requires connect:operate; staff-only. The AI reply suggestion is ADVISORY: it returns a draft
 * and sends nothing — the agent sends explicitly via `sendMessage`. Backend is the source of truth.
 */

export type ConversationStatus = 'open' | 'pending' | 'closed' | 'resolved';

export interface InboxRow {
  id: string;
  channel: string;
  customerId: string | null;
  status: ConversationStatus;
  aiMode: boolean;
  assignedAgentId: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  waitingOnStaff: boolean;
  waitingMinutes: number | null;
}

export interface InboxResponse {
  count: number;
  conversations: InboxRow[];
}

export interface InboxFilters {
  channel?: string;
  status?: ConversationStatus;
  assignedAgentId?: string;
  aiMode?: boolean;
  unassigned?: boolean;
  awaitingReply?: boolean;
  limit?: number;
}

export async function fetchInbox(
  token: string,
  filters: InboxFilters = {},
): Promise<InboxResponse> {
  const q = new URLSearchParams();
  if (filters.channel) q.set('channel', filters.channel);
  if (filters.status) q.set('status', filters.status);
  if (filters.assignedAgentId) q.set('assignedAgentId', filters.assignedAgentId);
  if (filters.aiMode !== undefined) q.set('aiMode', String(filters.aiMode));
  if (filters.unassigned !== undefined) q.set('unassigned', String(filters.unassigned));
  if (filters.awaitingReply !== undefined) q.set('awaitingReply', String(filters.awaitingReply));
  if (filters.limit) q.set('limit', String(filters.limit));
  const qs = q.toString();
  return apiGetAuthed<InboxResponse>(`/connect/conversations${qs ? `?${qs}` : ''}`, token);
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string | null;
  provenance: string;
  payload: unknown;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  channel: string;
  customerId: string | null;
  status: ConversationStatus;
  aiMode: boolean;
  assignedAgentId: string | null;
  handoffSummary: { latestQuestion: string | null; itemContext: unknown } | null;
  messages: ConversationMessage[];
}

export async function fetchConversation(token: string, id: string): Promise<ConversationDetail> {
  return apiGetAuthed<ConversationDetail>(`/connect/conversations/${id}`, token);
}

export async function assignConversation(
  token: string,
  id: string,
  agentId?: string,
): Promise<{ conversationId: string; assignedAgentId: string | null; status: ConversationStatus }> {
  return apiPost(`/connect/conversations/${id}/assign`, agentId ? { agentId } : {}, token);
}

export async function resolveConversation(
  token: string,
  id: string,
): Promise<{ conversationId: string; status: ConversationStatus }> {
  return apiPost(`/connect/conversations/${id}/resolve`, {}, token);
}

export interface ReplySuggestion {
  aiRunId: string;
  conversationId: string;
  suggestion: string;
  confidence: number;
  blocked: boolean;
  sent: false;
  disclaimer?: string;
}

export async function suggestReply(token: string, id: string): Promise<ReplySuggestion> {
  return apiPost<ReplySuggestion>(`/connect/conversations/${id}/suggest-reply`, {}, token);
}

export async function sendMessage(
  token: string,
  id: string,
  text: string,
): Promise<{ messageId: string }> {
  return apiPost(`/connect/conversations/${id}/messages`, { text, provenance: 'staff' }, token);
}
