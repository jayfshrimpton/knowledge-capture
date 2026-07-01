ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS review_due_date  timestamptz,
  ADD COLUMN IF NOT EXISTS review_cycle_days integer DEFAULT 365;
