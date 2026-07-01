// Shared types for the structured document produced by the Gemini pipeline.

export type DocumentFormat = 'procedure' | 'checklist' | 'diagram' | 'reference' | 'unstructured';

export interface DocumentSection {
  heading?: string;
  /** Prose content (for procedure/reference sections). */
  content?: string;
  /** Step description (for procedure steps). */
  desc?: string;
  /** List items (for checklist / bulleted sections). */
  items?: string[];
}

export type DiagramNodeType = 'device' | 'network' | 'process' | 'role' | 'data';

export interface DiagramNode {
  id: string;
  label: string;
  type: DiagramNodeType;
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

/** The exact JSON shape returned by the Gemini pipeline. */
export interface StructuredDocument {
  format: DocumentFormat;
  summary: string;
  sections: DocumentSection[];
  diagram: DiagramData | null;
  warnings: string[];
  tags: string[];
}

/** A persisted document row (snake_case to match the Postgres schema). */
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
  status?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** A row from document_versions (full). */
export interface DocumentVersionRow {
  id: string;
  document_id: string;
  version_number: number;
  content: DocumentSection[];
  structured_content: string | null;
  created_at: string;
  created_by: string | null;
}

/** Trimmed version row for list responses. */
export interface DocumentVersionListItem {
  id: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
}

/** How a user authenticated. Both ids are RFC-4122 UUIDs from disjoint namespaces. */
export type AuthProvider = 'entra' | 'supabase';

export type UserRole = 'admin' | 'member' | 'guest';

/** Authenticated request context attached by the auth middleware. */
export interface AuthContext {
  userId: string;
  orgId: string;
  role: UserRole;
  expiresAt: string | null;
  email: string | null;
  /** Which identity provider issued the validated token. */
  provider: AuthProvider;
  /**
   * Whether the issuing provider considers the email verified. Always true for
   * Entra (work/school accounts); reflects email confirmation for Supabase.
   */
  emailVerified: boolean;
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
