-- Motion add-on becomes tiered: Simple / Standard counted per scene,
-- Complex logged as a custom unit value (with a required reason).
-- The legacy motion_scenes column is kept for older entries.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS motion_simple INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motion_standard INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motion_custom NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motion_custom_reason TEXT;
