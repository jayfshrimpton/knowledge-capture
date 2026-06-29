import { authHeader } from './session';
import { DocumentRow, DocumentListItem, DocumentVersionListItem, DocumentVersionDetail, SearchResult, AskResponse, UserRole, Department, OrgMember, GuestInvite } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:3001';

// authHeader resolves the active provider (Entra or Supabase) and attaches its
// access token — see lib/session.ts.

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      // Re-throw with a code so callers can detect onboarding state.
      const err = new Error(message) as Error & { code?: string; status?: number };
      err.code = body?.code;
      err.status = res.status;
      throw err;
    } catch (e) {
      if (e instanceof Error && (e as any).status) throw e;
      throw new Error(message);
    }
  }
  return res.json() as Promise<T>;
}

export interface MeResponse {
  onboarded: boolean;
  email?: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    role: UserRole;
    orgId: string;
    orgName: string | null;
    expiresAt: string | null;
  };
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${API_URL}/api/me`, { headers: await authHeader() });
  return handle<MeResponse>(res);
}

export async function bootstrap(orgName: string, name?: string): Promise<{ orgId: string }> {
  const res = await fetch(`${API_URL}/api/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ orgName, name }),
  });
  return handle(res);
}

export interface CapturePayload {
  title: string;
  author?: string;
  rawText: string;
  sourceFilePath?: string | null;
  documentId?: string;
}

export async function capture(payload: CapturePayload): Promise<DocumentRow> {
  const res = await fetch(`${API_URL}/api/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(payload),
  });
  return handle<DocumentRow>(res);
}

export async function uploadFile(file: File): Promise<{ rawText: string; filePath: string | null }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: await authHeader(),
    body: form,
  });
  return handle(res);
}

export async function listDocuments(): Promise<DocumentListItem[]> {
  const res = await fetch(`${API_URL}/api/documents`, { headers: await authHeader() });
  return handle<DocumentListItem[]>(res);
}

export async function getDocument(id: string): Promise<DocumentRow> {
  const res = await fetch(`${API_URL}/api/documents/${id}`, { headers: await authHeader() });
  return handle<DocumentRow>(res);
}

export async function exportDocument(id: string, format: 'word' | 'pdf'): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/documents/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ format }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Export failed');
  }
  return res.blob();
}

// ---------------------------------------------------------------------------
// Document versions
// ---------------------------------------------------------------------------

export async function listDocumentVersions(id: string): Promise<DocumentVersionListItem[]> {
  const res = await fetch(`${API_URL}/api/documents/${id}/versions`, {
    headers: await authHeader(),
  });
  return handle<DocumentVersionListItem[]>(res);
}

export async function getDocumentVersion(id: string, versionNumber: number): Promise<DocumentVersionDetail> {
  const res = await fetch(`${API_URL}/api/documents/${id}/versions/${versionNumber}`, {
    headers: await authHeader(),
  });
  return handle<DocumentVersionDetail>(res);
}

export async function restoreDocumentVersion(id: string, versionNumber: number): Promise<DocumentRow> {
  const res = await fetch(`${API_URL}/api/documents/${id}/versions/${versionNumber}/restore`, {
    method: 'POST',
    headers: await authHeader(),
  });
  return handle<DocumentRow>(res);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export type TemplateFieldType = 'text' | 'textarea' | 'list' | 'date' | 'select';

export interface TemplateField {
  id: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  itemPlaceholder?: string;
}

export interface TemplateSchema extends TemplateListItem {
  fields: TemplateField[];
}

export async function listTemplates(): Promise<TemplateListItem[]> {
  const res = await fetch(`${API_URL}/api/templates`, { headers: await authHeader() });
  return handle<TemplateListItem[]>(res);
}

export async function getTemplate(id: string): Promise<TemplateSchema> {
  const res = await fetch(`${API_URL}/api/templates/${id}`, { headers: await authHeader() });
  return handle<TemplateSchema>(res);
}

export async function createFromTemplate(
  id: string,
  payload: { title: string; author?: string; values: Record<string, string | string[]> },
): Promise<DocumentRow> {
  const res = await fetch(`${API_URL}/api/templates/${id}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(payload),
  });
  return handle<DocumentRow>(res);
}

// ---------------------------------------------------------------------------
// Search & Ask (RAG)
// ---------------------------------------------------------------------------

export async function searchDocuments(query: string, limit = 10): Promise<SearchResult[]> {
  const res = await fetch(`${API_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ query, limit }),
  });
  return handle<SearchResult[]>(res);
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ question }),
  });
  return handle<AskResponse>(res);
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export async function listDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_URL}/api/departments`, { headers: await authHeader() });
  return handle<Department[]>(res);
}

export async function createDepartment(name: string): Promise<Department> {
  const res = await fetch(`${API_URL}/api/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ name }),
  });
  return handle<Department>(res);
}

export async function deleteDepartment(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/departments/${id}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

export async function addDeptMember(deptId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/departments/${deptId}/members/${userId}`, {
    method: 'POST',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

export async function removeDeptMember(deptId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/departments/${deptId}/members/${userId}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

export async function addDeptDocument(deptId: string, docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/departments/${deptId}/documents/${docId}`, {
    method: 'POST',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

export async function removeDeptDocument(deptId: string, docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/departments/${deptId}/documents/${docId}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

export async function updateDocumentVisibility(
  docId: string,
  patch: { visibility?: 'internal' | 'public'; departmentIds?: string[] },
): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${docId}/visibility`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(patch),
  });
  return handle<void>(res);
}

// ---------------------------------------------------------------------------
// Org members
// ---------------------------------------------------------------------------

export async function listOrgMembers(): Promise<OrgMember[]> {
  const res = await fetch(`${API_URL}/api/org/members`, { headers: await authHeader() });
  return handle<OrgMember[]>(res);
}

export async function updateOrgMember(
  userId: string,
  patch: { role?: UserRole; expiresAt?: string | null },
): Promise<OrgMember> {
  const res = await fetch(`${API_URL}/api/org/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(patch),
  });
  return handle<OrgMember>(res);
}

export async function removeOrgMember(userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/org/members/${userId}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

// ---------------------------------------------------------------------------
// Guest invites
// ---------------------------------------------------------------------------

export async function createGuestInvite(
  email: string,
  expiresAt: string,
): Promise<{ token: string; link: string }> {
  const res = await fetch(`${API_URL}/api/invites/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ email, expiresAt }),
  });
  return handle<{ token: string; link: string }>(res);
}

export async function listGuestInvites(): Promise<GuestInvite[]> {
  const res = await fetch(`${API_URL}/api/invites`, { headers: await authHeader() });
  return handle<GuestInvite[]>(res);
}

export async function getInviteByToken(
  token: string,
): Promise<{ email: string; orgName: string | null; expiresAt: string; valid: boolean }> {
  const res = await fetch(`${API_URL}/api/invites/${token}`);
  return handle(res);
}

export async function acceptInvite(token: string): Promise<{ orgId: string }> {
  const res = await fetch(`${API_URL}/api/invites/${token}/accept`, {
    method: 'POST',
    headers: await authHeader(),
  });
  return handle<{ orgId: string }>(res);
}

// ---------------------------------------------------------------------------
// Document shares
// ---------------------------------------------------------------------------

export async function listDocumentShares(docId: string): Promise<OrgMember[]> {
  const res = await fetch(`${API_URL}/api/documents/${docId}/shares`, { headers: await authHeader() });
  return handle<OrgMember[]>(res);
}

export async function shareDocument(docId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${docId}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ userId }),
  });
  return handle<void>(res);
}

export async function unshareDocument(docId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${docId}/shares/${userId}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  return handle<void>(res);
}

// ---------------------------------------------------------------------------
// Public document access (no auth)
// ---------------------------------------------------------------------------

export async function getPublicDocument(id: string): Promise<DocumentRow> {
  const res = await fetch(`${API_URL}/api/public/documents/${id}`);
  return handle<DocumentRow>(res);
}

export async function transcribeAudio(blob: Blob, filename = 'recording.webm'): Promise<{ transcript: string }> {
  const form = new FormData();
  form.append('audio', blob, filename);
  const res = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    headers: await authHeader(),
    body: form,
  });
  return handle(res);
}

// ---------------------------------------------------------------------------
// Gap dashboard
// ---------------------------------------------------------------------------

export interface FlaggedDoc {
  id: string;
  title: string;
  warnings: string[];
  author_name: string | null;
  created_at: string;
}

export interface SearchMiss {
  query: string;
  count: number;
}

export interface TagCoverage {
  tag: string;
  count: number;
}

export interface UserActivity {
  userId: string;
  email: string;
  name: string | null;
  count: number;
}

export async function getGapsFlagged(): Promise<FlaggedDoc[]> {
  const res = await fetch(`${API_URL}/api/gaps/flagged`, { headers: await authHeader() });
  return handle<FlaggedDoc[]>(res);
}

export async function getGapsSearchMisses(): Promise<SearchMiss[]> {
  const res = await fetch(`${API_URL}/api/gaps/search-misses`, { headers: await authHeader() });
  return handle<SearchMiss[]>(res);
}

export async function getGapsCoverage(): Promise<TagCoverage[]> {
  const res = await fetch(`${API_URL}/api/gaps/coverage`, { headers: await authHeader() });
  return handle<TagCoverage[]>(res);
}

export async function getGapsActivity(): Promise<UserActivity[]> {
  const res = await fetch(`${API_URL}/api/gaps/activity`, { headers: await authHeader() });
  return handle<UserActivity[]>(res);
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export type BillingPlan = 'starter' | 'business';

export interface BillingStatus {
  plan: string;
  seats: number;
  billing_status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  billing_period_end: string | null;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const res = await fetch(`${API_URL}/api/billing/status`, { headers: await authHeader() });
  return handle<BillingStatus>(res);
}

export async function createCheckoutSession(plan: BillingPlan, seats?: number): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ plan, seats }),
  });
  return handle<{ checkoutUrl: string }>(res);
}

export async function getBillingPortalUrl(): Promise<{ portalUrl: string }> {
  const res = await fetch(`${API_URL}/api/billing/portal`, { headers: await authHeader() });
  return handle<{ portalUrl: string }>(res);
}
