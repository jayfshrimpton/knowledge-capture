-- Brand styles — organisation document styling captured from an uploaded
-- reference document (fonts, colours, logo, structure) and applied to exports.
--
-- An org may save several styles but only one may be the default. The default
-- style is applied to every Word / PDF export for that org.

create table if not exists org_styles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade not null,
  name text not null,
  is_default boolean not null default false,
  -- The extracted / edited style definition. Shape mirrors the BrandStyle
  -- interface in backend/src/types.ts (fonts, colors, logo, structure).
  style jsonb not null,
  -- Original uploaded reference document, stored in the "documents" bucket.
  source_file_path text,
  source_filename text,
  -- Extracted logo image, stored in the "documents" bucket (null if none found).
  logo_path text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists org_styles_org_id_idx on org_styles (org_id);

-- At most one default style per organisation.
create unique index if not exists org_styles_one_default_idx
  on org_styles (org_id)
  where is_default;

-- ---------------------------------------------------------------------------
-- Row-level security (defence in depth — the backend uses the service role key
-- and scopes every query by org_id explicitly, mirroring the other tables).
-- ---------------------------------------------------------------------------
alter table org_styles enable row level security;

drop policy if exists "org members can read styles" on org_styles;
create policy "org members can read styles"
  on org_styles for select
  using (
    org_id in (select org_id from users where id = auth.uid())
  );
