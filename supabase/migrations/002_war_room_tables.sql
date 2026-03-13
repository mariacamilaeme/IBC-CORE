-- =====================================================
-- War Room Tables: Tasks & Notes
-- Run this migration in Supabase SQL Editor
-- =====================================================

-- ─── WAR ROOM TASKS ─────────────────────────────────
CREATE TABLE public.war_room_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baja','media','alta','urgente')),
  category TEXT DEFAULT 'general',
  due_date TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  related_contract_id UUID,
  related_client_name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.war_room_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_tasks" ON public.war_room_tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tasks" ON public.war_room_tasks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tasks" ON public.war_room_tasks
  FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_wr_tasks_assigned ON public.war_room_tasks(assigned_to);
CREATE INDEX idx_wr_tasks_due ON public.war_room_tasks(due_date);
CREATE INDEX idx_wr_tasks_completed ON public.war_room_tasks(is_completed);
CREATE INDEX idx_wr_tasks_category ON public.war_room_tasks(category);

CREATE TRIGGER war_room_tasks_updated_at
  BEFORE UPDATE ON public.war_room_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── WAR ROOM NOTES ─────────────────────────────────
CREATE TABLE public.war_room_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'default' CHECK (color IN ('default','blue','green','amber','red','violet')),
  pinned BOOLEAN DEFAULT FALSE,
  linked_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.war_room_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_notes" ON public.war_room_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_notes" ON public.war_room_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_notes" ON public.war_room_notes
  FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_wr_notes_created_by ON public.war_room_notes(created_by);
CREATE INDEX idx_wr_notes_linked_date ON public.war_room_notes(linked_date);

CREATE TRIGGER war_room_notes_updated_at
  BEFORE UPDATE ON public.war_room_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
