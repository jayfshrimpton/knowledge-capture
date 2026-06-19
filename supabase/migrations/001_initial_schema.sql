-- Knowledge Capture Tool — initial schema
-- Run via Supabase SQL editor or `supabase db push`.

-- Organisations (one per business)
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Users (linked to an org). id matches the Supabase auth user id.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organisations(id),
  name text,
  email text,
  role text default 'member', -- 'admin' | 'member'
  created_at timestamptz default now()
);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) not null,
  created_by uuid references users(id),
  title text not null,
  author_name text,
  format text not null, -- 'procedure' | 'checklist' | 'reference' | 'diagram'
  summary text,
  content jsonb not null,      -- structured sections array
  diagram_data jsonb,          -- nodes + connections if format = 'diagram'
  warnings text[],             -- gaps detected
  tags text[],
  raw_input text,              -- original notes stored for audit
  source_file_path text,       -- if uploaded from file
  version integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists documents_org_id_idx on documents (org_id);
create index if not exists documents_created_at_idx on documents (created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
-- The backend uses the service role key (which bypasses RLS) and scopes every
-- query by org_id explicitly. These policies enforce the same boundary for any
-- direct client (supabase-js with a user JWT) as defence in depth.

alter table organisations enable row level security;
alter table users enable row level security;
alter table documents enable row level security;

-- Users can read their own user row.
drop policy if exists "users can read self" on users;
create policy "users can read self"
  on users for select
  using (id = auth.uid());

-- Users can read the organisation they belong to.
drop policy if exists "members can read own org" on organisations;
create policy "members can read own org"
  on organisations for select
  using (id = (select org_id from users where id = auth.uid()));

-- Documents: members can only read/insert within their own org.
drop policy if exists "org members can read own docs" on documents;
create policy "org members can read own docs"
  on documents for select
  using (org_id = (select org_id from users where id = auth.uid()));

drop policy if exists "org members can insert" on documents;
create policy "org members can insert"
  on documents for insert
  with check (org_id = (select org_id from users where id = auth.uid()));

drop policy if exists "org members can update own docs" on documents;
create policy "org members can update own docs"
  on documents for update
  using (org_id = (select org_id from users where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded source files and generated exports.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
