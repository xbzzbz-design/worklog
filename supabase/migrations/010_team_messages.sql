-- Team wall: short collective messages to the whole team (solidarity, thanks).
-- Not directed at individuals, no reactions/counts — so the absence of a reaction
-- can never single anyone out.
CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tm_select" ON public.team_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "tm_insert" ON public.team_messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "tm_delete" ON public.team_messages FOR DELETE TO authenticated USING (author_id = auth.uid());
