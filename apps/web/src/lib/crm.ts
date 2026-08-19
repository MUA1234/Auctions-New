import { apiGetAuthed, apiPatch, apiPost } from './api';

/**
 * Singha CRM (staff operations) client — internal notes, tasks/follow-ups, and the staff Customer
 * 360 projections (transactional history + unified timeline). Every endpoint requires crm:read /
 * crm:manage and is STAFF-ONLY; none of this is ever shown on a customer surface (§19). The
 * backend (Auctions-Backend) is the single source of truth — these are typed read/command wrappers.
 */

// ── Notes (append-only) ───────────────────────────────────────────────────────
export interface CrmNote {
  id: string;
  subjectType: string;
  subjectId: string;
  body: string;
  visibility: 'staff' | 'restricted';
  authorId: string | null;
  createdAt: string;
}

export async function fetchCustomerNotes(token: string, customerId: string): Promise<CrmNote[]> {
  const params = new URLSearchParams({ subjectType: 'customer', subjectId: customerId });
  return apiGetAuthed<CrmNote[]>(`/crm/notes?${params.toString()}`, token);
}

export async function addCustomerNote(
  token: string,
  customerId: string,
  body: string,
  visibility: 'staff' | 'restricted' = 'staff',
): Promise<CrmNote> {
  return apiPost<CrmNote>(
    '/crm/notes',
    { subjectType: 'customer', subjectId: customerId, body, visibility },
    token,
  );
}

// ── Tasks / follow-ups ────────────────────────────────────────────────────────
export type CrmTaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type CrmTaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: CrmTaskPriority;
  status: CrmTaskStatus;
  customerId: string | null;
  assigneeId: string | null;
  team: string | null;
  dueAt: string | null;
  remindAt: string | null;
  source: string;
  sensitive: boolean;
  result: string | null;
  createdBy: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTasksParams {
  status?: CrmTaskStatus;
  customerId?: string;
  assigneeId?: string;
  overdue?: boolean;
  limit?: number;
}

export async function listTasks(token: string, params: ListTasksParams = {}): Promise<CrmTask[]> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.customerId) q.set('customerId', params.customerId);
  if (params.assigneeId) q.set('assigneeId', params.assigneeId);
  if (params.overdue) q.set('overdue', 'true');
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiGetAuthed<CrmTask[]>(`/crm/tasks${qs ? `?${qs}` : ''}`, token);
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: string;
  priority?: CrmTaskPriority;
  customerId?: string;
  dueAt?: string;
  sensitive?: boolean;
}

export async function createTask(token: string, input: CreateTaskInput): Promise<CrmTask> {
  return apiPost<CrmTask>('/crm/tasks', input, token);
}

export async function updateTask(
  token: string,
  id: string,
  input: Partial<{ status: CrmTaskStatus; priority: CrmTaskPriority; result: string }>,
): Promise<CrmTask> {
  return apiPatch<CrmTask>(`/crm/tasks/${id}`, input, token);
}

// ── Customer 360 — transactional history + unified timeline ────────────────────
export interface CrmHistory {
  customer: { id: string; clientReference: string | null; legalName: string | null };
  currency: string;
  summary: {
    activeAuctions: number;
    wonAuctions: number;
    purchases: number;
    purchaseValueMinor: number;
    openInvoices: number;
    openInvoicesMinor: number;
    openOffers: number;
    openEois: number;
    tenders: number;
    deliveryPending: number;
  };
  openInvoices: Array<{
    invoiceId: string;
    number: string;
    listing: LotLabel;
    amountDueMinor: number;
    currency: string;
    dueAt: string | null;
  }>;
  liveAuctions: Array<{
    auctionId: string;
    listing: LotLabel;
    winning: boolean;
    currentBidMinor: number | null;
    endsAt: string | null;
    currency: string;
  }>;
  openOffers: Array<{
    offerId: string;
    listing: LotLabel;
    status: string;
    amountMinor: number;
    currency: string;
  }>;
  openEois: Array<{
    eoiId: string;
    listing: LotLabel;
    status: string;
    amountMinor: number | null;
    currency: string;
  }>;
  recentPurchases: Array<{
    saleId: string;
    listing: LotLabel;
    amountMinor: number;
    currency: string;
    at: string | null;
  }>;
}

export interface LotLabel {
  listingId: string;
  reference: string;
  title: string;
  category: string;
}

export interface TimelineEntry {
  at: string;
  kind: string;
  title: string;
  refType: string;
  refId: string;
  listing?: LotLabel | null;
  amountMinor?: number | null;
  currency?: string | null;
  status?: string | null;
}

export interface CrmTimeline {
  customerId: string;
  count: number;
  entries: TimelineEntry[];
}

export async function fetchCustomerHistory(token: string, customerId: string): Promise<CrmHistory> {
  return apiGetAuthed<CrmHistory>(`/crm/customers/${customerId}/history`, token);
}

export async function fetchCustomerTimeline(
  token: string,
  customerId: string,
  limit = 100,
): Promise<CrmTimeline> {
  return apiGetAuthed<CrmTimeline>(`/crm/customers/${customerId}/timeline?limit=${limit}`, token);
}
