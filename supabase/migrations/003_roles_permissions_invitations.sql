-- =====================================================
-- IBC CORE — MIGRACIÓN 003: Roles, Permisos e Invitaciones
-- Ejecutar en el Editor SQL de Supabase
-- =====================================================

-- ============================================
-- TABLA: roles
-- Descripción: Define los roles del sistema (dinámicos)
-- ============================================
CREATE TABLE public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- ALTER: profiles (ANTES de crear tablas que dependen de profiles)
-- Descripción: Agregar columna role_id y position
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;

-- ============================================
-- TABLA: permissions
-- Descripción: Matriz de permisos por rol y módulo
-- ============================================
CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, module)
);

CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TABLA: invitations
-- Descripción: Registro de invitaciones enviadas por el admin
-- ============================================
CREATE TABLE public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- ÍNDICES para rendimiento
-- (role_id ya existe en profiles gracias al ALTER anterior)
-- ============================================
CREATE INDEX idx_permissions_role ON public.permissions(role_id);
CREATE INDEX idx_permissions_module ON public.permissions(module);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_invited_by ON public.invitations(invited_by);
CREATE INDEX idx_profiles_role_id ON public.profiles(role_id);

-- ============================================
-- DATOS SEMILLA: Roles por defecto
-- ============================================
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema. No puede ser modificado ni eliminado.', true),
  ('directora', 'Directora', 'Acceso completo a todos los módulos y configuración.', true),
  ('analista', 'Analista', 'Acceso a módulos operativos, sin configuración del sistema.', false),
  ('comercial', 'Comercial', 'Acceso limitado a módulos de ventas y clientes propios.', false)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DATOS SEMILLA: Permisos por defecto + vincular profiles existentes
-- ============================================
DO $$
DECLARE
  v_admin_id UUID;
  v_directora_id UUID;
  v_analista_id UUID;
  v_comercial_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO v_directora_id FROM public.roles WHERE name = 'directora';
  SELECT id INTO v_analista_id FROM public.roles WHERE name = 'analista';
  SELECT id INTO v_comercial_id FROM public.roles WHERE name = 'comercial';

  -- ===== ADMIN: acceso total =====
  INSERT INTO public.permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES
    (v_admin_id, 'dashboard', true, true, true, true),
    (v_admin_id, 'contracts', true, true, true, true),
    (v_admin_id, 'clients', true, true, true, true),
    (v_admin_id, 'quotations', true, true, true, true),
    (v_admin_id, 'invoices', true, true, true, true),
    (v_admin_id, 'packing_lists', true, true, true, true),
    (v_admin_id, 'packing_list_converter', true, true, true, true),
    (v_admin_id, 'shipments', true, true, true, true),
    (v_admin_id, 'payments', true, true, true, true),
    (v_admin_id, 'reports', true, true, true, true),
    (v_admin_id, 'calendar', true, true, true, true),
    (v_admin_id, 'settings', true, true, true, true)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- ===== DIRECTORA: acceso total =====
  INSERT INTO public.permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES
    (v_directora_id, 'dashboard', true, true, true, true),
    (v_directora_id, 'contracts', true, true, true, true),
    (v_directora_id, 'clients', true, true, true, true),
    (v_directora_id, 'quotations', true, true, true, true),
    (v_directora_id, 'invoices', true, true, true, true),
    (v_directora_id, 'packing_lists', true, true, true, true),
    (v_directora_id, 'packing_list_converter', true, true, true, true),
    (v_directora_id, 'shipments', true, true, true, true),
    (v_directora_id, 'payments', true, true, true, true),
    (v_directora_id, 'reports', true, true, true, true),
    (v_directora_id, 'calendar', true, true, true, true),
    (v_directora_id, 'settings', true, true, true, true)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- ===== ANALISTA: acceso operativo, sin settings =====
  INSERT INTO public.permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES
    (v_analista_id, 'dashboard', true, false, false, false),
    (v_analista_id, 'contracts', true, true, true, false),
    (v_analista_id, 'clients', true, true, true, false),
    (v_analista_id, 'quotations', true, true, true, false),
    (v_analista_id, 'invoices', true, true, true, false),
    (v_analista_id, 'packing_lists', true, true, true, false),
    (v_analista_id, 'packing_list_converter', true, true, true, false),
    (v_analista_id, 'shipments', true, true, true, false),
    (v_analista_id, 'payments', true, true, true, false),
    (v_analista_id, 'reports', true, false, false, false),
    (v_analista_id, 'calendar', true, true, true, false),
    (v_analista_id, 'settings', false, false, false, false)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- ===== COMERCIAL: acceso limitado =====
  INSERT INTO public.permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES
    (v_comercial_id, 'dashboard', true, false, false, false),
    (v_comercial_id, 'contracts', true, true, true, false),
    (v_comercial_id, 'clients', true, true, true, false),
    (v_comercial_id, 'quotations', true, true, true, false),
    (v_comercial_id, 'invoices', false, false, false, false),
    (v_comercial_id, 'packing_lists', false, false, false, false),
    (v_comercial_id, 'packing_list_converter', false, false, false, false),
    (v_comercial_id, 'shipments', true, false, false, false),
    (v_comercial_id, 'payments', true, false, false, false),
    (v_comercial_id, 'reports', true, false, false, false),
    (v_comercial_id, 'calendar', true, true, true, false),
    (v_comercial_id, 'settings', false, false, false, false)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- ===== Vincular profiles existentes con sus roles =====
  UPDATE public.profiles SET role_id = v_admin_id WHERE role = 'admin' AND role_id IS NULL;
  UPDATE public.profiles SET role_id = v_directora_id WHERE role = 'directora' AND role_id IS NULL;
  UPDATE public.profiles SET role_id = v_analista_id WHERE role = 'analista' AND role_id IS NULL;
  UPDATE public.profiles SET role_id = v_comercial_id WHERE role = 'comercial' AND role_id IS NULL;

END $$;

-- ============================================
-- ACTUALIZAR FUNCIÓN handle_new_user
-- Descripción: Ahora también asigna role_id al crear perfil
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name TEXT;
  v_role_id UUID;
BEGIN
  v_role_name := COALESCE(NEW.raw_user_meta_data->>'role', 'comercial');

  SELECT id INTO v_role_id FROM public.roles WHERE name = v_role_name;

  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'comercial';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    v_role_name,
    v_role_id
  );
  RETURN NEW;
END;
$$;

-- ============================================
-- FUNCIÓN HELPER: get_user_permissions
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID, p_module TEXT)
RETURNS TABLE(can_view BOOLEAN, can_create BOOLEAN, can_edit BOOLEAN, can_delete BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.can_view, p.can_create, p.can_edit, p.can_delete
  FROM public.permissions p
  JOIN public.profiles pr ON pr.role_id = p.role_id
  WHERE pr.id = p_user_id AND p.module = p_module;
$$;

-- ============================================
-- RLS: roles
-- ============================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_all"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roles_insert_admin"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "roles_update_admin"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "roles_delete_admin"
  ON public.roles FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin' AND is_system = false);

-- ============================================
-- RLS: permissions
-- ============================================
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select_all"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "permissions_insert_admin"
  ON public.permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "permissions_update_admin"
  ON public.permissions FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "permissions_delete_admin"
  ON public.permissions FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ============================================
-- RLS: invitations
-- ============================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_select_admin"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "invitations_insert_admin"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "invitations_update_admin"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ============================================
-- STORAGE: Bucket para avatares
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- FIN DE LA MIGRACIÓN 003
-- ============================================
