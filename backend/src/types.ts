// Shared types for the structured document produced by the Gemini pipeline.

export type DocumentFormat = 'procedure' | 'checklist' | 'diagram' | 'reference';

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
  version: number;
  created_at: string;
  updated_at: string;
}

/** Authenticated request context attached by the auth middleware. */
export interface AuthContext {
  userId: string;
  orgId: string;
  email: string | null;
}
