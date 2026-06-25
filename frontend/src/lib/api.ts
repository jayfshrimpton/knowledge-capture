import { supabase } from './supabase';
import { DocumentRow, DocumentListItem } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:3001';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
    role: string;
    orgId: string;
    orgName: string | null;
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
