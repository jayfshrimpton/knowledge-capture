export type DocumentFormat = 'procedure' | 'checklist' | 'diagram' | 'reference';
export type UserRole = 'admin' | 'member' | 'guest';
export type DocumentVisibility = 'internal' | 'public';

export interface DocumentSection {
  heading?: string;
  content?: string;
  desc?: string;
  items?: string[];
}

export interface DiagramNode {
  id: string;
  label: string;
  type: 'device' | 'network' | 'process' | 'role' | 'data';
}

export interface DiagramConnection {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramData {
  description: string;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
}

/** Full document row returned by the API. */
export interface DocumentRow {
  id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  author_name: string | null;
  format: DocumentFormat;
  summary: string | null;
  content: DocumentSection[];
  diagram_data: DiagramData | null;
  warnings: string[] | null;
  tags: string[] | null;
  raw_input: string | null;
  source_file_path: string | null;
  source: 'ai' | 'template';
  visibility: DocumentVisibility;
  version: number;
  created_at: string;
  updated_at: string;
}

/** A version entry returned by GET /api/documents/:id/versions. */
export interface DocumentVersionListItem {
  id: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
}

/** Full version detail returned by GET /api/documents/:id/versions/:versionNumber. */
export interface DocumentVersionDetail extends DocumentVersionListItem {
  document_id: string;
  content: DocumentSection[];
  structured_content: string | null;
}

/** Trimmed row returned by GET /api/documents. */
export interface DocumentListItem {
  id: string;
  title: string;
  author_name: string | null;
  format: DocumentFormat;
  summary: string | null;
  tags: string[] | null;
  source: 'ai' | 'template';
  visibility: DocumentVisibility;
  departments: string[];
  created_at: string;
  updated_at: string;
}

/** Result from POST /api/search — DocumentListItem plus a similarity score. */
export interface SearchResult extends DocumentListItem {
  similarity: number;
}

/** Response from POST /api/ask. */
export interface AskResponse {
  answer: string;
  sources: Array<{ id: string; title: string; similarity: number }>;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
  memberCount: number;
}

export interface OrgMember {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  departments: string[];
}

export interface GuestInvite {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}
