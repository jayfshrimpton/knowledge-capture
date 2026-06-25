-- Add source column to documents to distinguish AI-generated vs template-based docs.
-- Defaults to 'ai' so all existing rows retain the correct value with no backfill needed.

alter table documents
  add column if not exists source text not null default 'ai';

-- Allowed values: 'ai' | 'template'
