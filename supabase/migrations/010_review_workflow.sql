-- Add review columns to documents
ALTER TABLE public.documents
  ALTER COLUMN status SET DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id);

-- Update status check to include all states
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_status_check
  CHECK (status IN ('draft', 'in_review', 'approved', 'published'));

-- Set existing 'published' docs to stay published
UPDATE public.documents SET status = 'published' WHERE status = 'published';

-- Review comments table
CREATE TABLE IF NOT EXISTS public.review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.review_comments (document_id, created_at DESC);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read review comments"
  ON public.review_comments FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE org_id = public.current_user_org_id()
    )
  );

CREATE POLICY "org members can insert review comments"
  ON public.review_comments FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents WHERE org_id = public.current_user_org_id()
    )
  );
