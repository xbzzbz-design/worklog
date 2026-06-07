-- 003: team-wide job-type rates + per-condition add-on, with "last edited by" audit
-- Lives on the single team_settings row (id=1). Anyone can edit (no admin) — we just
-- record who changed it last so it's transparent, not anonymous.

ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS add_on NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS custom_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rates_updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rates_updated_at TIMESTAMPTZ;
