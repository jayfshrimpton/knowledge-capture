-- Track search queries and their result counts so the gap dashboard can
-- surface topics that staff search for but no documents cover.

create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) not null,
  query text not null,
  result_count integer not null,
  created_at timestamptz default now()
);

create index on search_logs (org_id, created_at desc);
create index on search_logs (org_id, result_count, created_at desc);

alter table search_logs enable row level security;

drop policy if exists "org members can read own search logs" on search_logs;
create policy "org members can read own search logs"
  on search_logs for select
  using (org_id = (select org_id from users where id = auth.uid()));
