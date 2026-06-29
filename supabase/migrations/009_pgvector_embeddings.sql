-- Enable pgvector extension (already available in Supabase-hosted Postgres).
create extension if not exists vector;

-- Add 768-dimensional embedding column (text-embedding-004 output size).
alter table documents add column if not exists embedding vector(768);

-- HNSW index for cosine similarity search — preferred over IVFFlat for
-- dynamic datasets since it doesn't require a fixed list count up front.
create index if not exists documents_embedding_hnsw_idx
  on documents
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC function used by the backend to run org-scoped vector similarity search.
create or replace function match_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count     int,
  p_org_id        uuid
)
returns table (
  id          uuid,
  title       text,
  author_name text,
  format      text,
  summary     text,
  tags        text[],
  source      text,
  created_at  timestamptz,
  updated_at  timestamptz,
  similarity  float
)
language sql stable
as $$
  select
    id,
    title,
    author_name,
    format,
    summary,
    tags,
    source,
    created_at,
    updated_at,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where org_id = p_org_id
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
