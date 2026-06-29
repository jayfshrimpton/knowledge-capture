-- COM-14: Role-based access control — departments, document visibility, guest access.

-- Departments
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User ↔ Department membership
CREATE TABLE user_departments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, department_id)
);

-- Document ↔ Department scoping (no rows = org-wide)
CREATE TABLE document_departments (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, department_id)
);

-- Explicit per-user document shares (for guest access)
CREATE TABLE document_shares (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, user_id)
);

-- Visibility flag on documents
ALTER TABLE documents
  ADD COLUMN visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'public'));

-- Guest role and expiry on users
ALTER TABLE users
  ADD COLUMN expires_at timestamptz,
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'member', 'guest'));

-- Guest invite tokens
CREATE TABLE guest_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Helper: document IDs visible to a member (org-wide OR in their departments)
CREATE OR REPLACE FUNCTION get_member_visible_docs(p_org_id uuid, p_user_id uuid)
RETURNS TABLE(document_id uuid) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT d.id
  FROM documents d
  WHERE d.org_id = p_org_id
    AND NOT EXISTS (
      SELECT 1 FROM document_departments dd WHERE dd.document_id = d.id
    )
  UNION
  SELECT dd.document_id
  FROM document_departments dd
  JOIN user_departments ud ON ud.department_id = dd.department_id
  WHERE ud.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM documents d2 WHERE d2.id = dd.document_id AND d2.org_id = p_org_id
    )
$$;

-- Helper: document IDs visible to a guest (public OR explicitly shared with them)
CREATE OR REPLACE FUNCTION get_guest_visible_docs(p_org_id uuid, p_user_id uuid)
RETURNS TABLE(document_id uuid) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT d.id
  FROM documents d
  WHERE d.org_id = p_org_id AND d.visibility = 'public'
  UNION
  SELECT ds.document_id
  FROM document_shares ds
  JOIN documents d ON d.id = ds.document_id
  WHERE ds.user_id = p_user_id AND d.org_id = p_org_id
$$;
