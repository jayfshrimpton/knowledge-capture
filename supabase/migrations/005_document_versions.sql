create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_number integer not null,
  content jsonb not null,
  structured_content text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint document_versions_doc_version_unique unique (document_id, version_number)
);

create index on document_versions(document_id, version_number);

alter table document_versions enable row level security;

create policy "org members can read versions"
  on document_versions for select
  using (
    document_id in (
      select id from documents
      where org_id = (select org_id from users where id = auth.uid())
    )
  );
