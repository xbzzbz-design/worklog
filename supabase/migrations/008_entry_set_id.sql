-- Pieces logged together via "Save & add another to this set" share a set id,
-- so a mixed set collapses into one line on the report (its combined units make
-- an over-scope set obvious at a glance).
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS set_id TEXT;
