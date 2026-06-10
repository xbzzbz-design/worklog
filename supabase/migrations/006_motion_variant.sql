-- Variation / Adaptation entries can be a still image (default) or a motion
-- version (double the still-image rate).
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS motion_variant BOOLEAN DEFAULT FALSE;
