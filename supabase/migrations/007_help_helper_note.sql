-- A helper can leave a note when they lend a hand (e.g. "I'll take 3 banners"
-- or "I'll push the deadline to Friday so you've got room").
ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS helper_note TEXT;
