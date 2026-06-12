-- Photo set: one entry that contains several typed pieces (a cart), so a mixed
-- set is one line / one "piece" — including for difficulty scoring and revisions.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS set_items JSONB;
