-- WorkLog initial schema

-- Users (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Team Member',
  daily_max NUMERIC(4,1) NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Entries
CREATE TABLE public.entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  date DATE NOT NULL,
  job_type TEXT NOT NULL,
  other_kind TEXT,
  quantity NUMERIC(6,1) NOT NULL DEFAULT 1,
  is_revision BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES public.entries(id),
  revision_round INT,
  revision_severity TEXT,
  revision_cause TEXT,
  motion_scenes INT DEFAULT 0,
  condition_brief_incomplete BOOLEAN DEFAULT FALSE,
  condition_asset_not_provided BOOLEAN DEFAULT FALSE,
  condition_deadline_rush BOOLEAN DEFAULT FALSE,
  calculated_units NUMERIC(6,2) NOT NULL,
  manual_override NUMERIC(6,2),
  manual_override_reason TEXT,
  note TEXT,
  drive_link TEXT,
  snap_image_path TEXT,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_note TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_select" ON public.entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "entries_insert" ON public.entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "entries_update" ON public.entries FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "entries_delete" ON public.entries FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER entries_updated_at BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Holidays (shared)
CREATE TABLE public.holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_all" ON public.holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pre-load Primal Co. holidays
INSERT INTO public.holidays (date, name) VALUES
  ('2026-07-28', 'King Vajiralongkorn''s Birthday'),
  ('2026-07-29', 'Asalha Bucha'),
  ('2026-08-12', 'The Queen Mother''s Birthday'),
  ('2026-10-13', 'Anniversary of the Death of King Bhumibol'),
  ('2026-10-23', 'Chulalongkorn Day'),
  ('2026-12-07', 'King Bhumibol''s Birthday / Father''s Day'),
  ('2026-12-10', 'Constitution Day'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-31', 'New Year''s Eve');

-- Leave (personal)
CREATE TABLE public.leave (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sick', 'vacation')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.leave ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_select" ON public.leave FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_insert" ON public.leave FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave_delete" ON public.leave FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Help requests
CREATE TABLE public.help_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  hours_needed NUMERIC(4,1),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved')),
  handled_by UUID REFERENCES public.users(id),
  thanks_message TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "help_select" ON public.help_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "help_insert" ON public.help_requests FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "help_update" ON public.help_requests FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR handled_by = auth.uid() OR status = 'open');

-- Team settings (one row)
CREATE TABLE public.team_settings (
  id INT PRIMARY KEY DEFAULT 1,
  workdays INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  holiday_addon NUMERIC(4,2) DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_settings_select" ON public.team_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_settings_update" ON public.team_settings FOR UPDATE TO authenticated USING (true);
INSERT INTO public.team_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Supabase Storage bucket for snaps
INSERT INTO storage.buckets (id, name, public) VALUES ('snaps', 'snaps', false) ON CONFLICT DO NOTHING;
CREATE POLICY "snaps_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'snaps');
CREATE POLICY "snaps_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'snaps' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "snaps_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'snaps' AND (storage.foldername(name))[1] = auth.uid()::text);
