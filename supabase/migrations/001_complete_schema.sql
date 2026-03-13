-- =====================================================
-- IBC CORE — SCHEMA COMPLETO
-- Ejecutar en el Editor SQL de Supabase
-- =====================================================

-- 0. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. FUNCIÓN HELPER: get_user_role
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

-- =====================================================
-- 2. FUNCIÓN TRIGGER: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. FUNCIÓN: Crear perfil automáticamente al registrar usuario
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'comercial')
  );
  RETURN NEW;
END;
$$;

-- =====================================================
-- TABLA 1: profiles
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'comercial' CHECK (role IN ('admin','directora','analista','comercial')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TABLA 2: system_config
-- =====================================================
CREATE TABLE public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'IBC Steel Group',
  company_tax_id TEXT,
  company_address TEXT,
  company_city TEXT,
  company_country TEXT DEFAULT 'Colombia',
  company_phone TEXT,
  company_email TEXT,
  company_logo_url TEXT,
  default_currency TEXT DEFAULT 'USD',
  exchange_rate_usd_cop DECIMAL(15,2),
  invoice_prefix TEXT DEFAULT 'FAC-',
  invoice_next_number INTEGER DEFAULT 1,
  quotation_prefix TEXT DEFAULT 'COT-',
  quotation_next_number INTEGER DEFAULT 1,
  packing_list_prefix TEXT DEFAULT 'PL-',
  packing_list_next_number INTEGER DEFAULT 1,
  shipment_prefix TEXT DEFAULT 'EMB-',
  shipment_next_number INTEGER DEFAULT 1,
  fiscal_data JSONB DEFAULT '{}',
  document_templates JSONB DEFAULT '{}',
  email_settings JSONB DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 3: clients
-- =====================================================
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  contact_name TEXT,
  contact_position TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  postal_code TEXT,
  tax_id TEXT,
  tax_regime TEXT,
  assigned_commercial_id UUID REFERENCES public.profiles(id),
  client_type TEXT CHECK (client_type IN ('nacional','internacional','distribuidor','usuario_final')),
  industry_sector TEXT,
  payment_terms TEXT,
  credit_limit DECIMAL(15,2),
  preferred_currency TEXT DEFAULT 'USD',
  shipping_addresses JSONB DEFAULT '[]',
  additional_contacts JSONB DEFAULT '[]',
  tags TEXT[],
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 4: vessels (Motonaves)
-- =====================================================
CREATE TABLE public.vessels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_name TEXT NOT NULL,
  imo_number TEXT UNIQUE,
  flag TEXT,
  shipping_line TEXT,
  vessel_type TEXT,
  capacity_tons DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER vessels_updated_at
  BEFORE UPDATE ON public.vessels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 5: invoices
-- =====================================================
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  quotation_id UUID, -- FK se agrega después por dependencia circular
  client_id UUID NOT NULL REFERENCES public.clients(id),
  commercial_id UUID NOT NULL REFERENCES public.profiles(id),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT DEFAULT 'USD',
  exchange_rate DECIMAL(15,4),
  subtotal DECIMAL(15,2) NOT NULL,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  total_amount_cop DECIMAL(15,2),
  payment_status TEXT DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente','parcial','pagada','vencida','anulada')),
  payment_method TEXT,
  payment_date DATE,
  payment_reference TEXT,
  partial_payments JSONB DEFAULT '[]',
  items JSONB DEFAULT '[]',
  incoterm TEXT,
  port_of_origin TEXT,
  port_of_destination TEXT,
  vessel_id UUID REFERENCES public.vessels(id),
  shipping_id UUID, -- FK se agrega después
  payment_conditions TEXT,
  bank_details JSONB,
  document_url TEXT,
  status_history JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 6: quotations
-- =====================================================
CREATE TABLE public.quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  commercial_id UUID NOT NULL REFERENCES public.profiles(id),
  product_line TEXT CHECK (product_line IN ('agro','mp','maquinas','otro')),
  material TEXT,
  material_specs TEXT,
  quantity DECIMAL(15,2),
  unit TEXT,
  unit_price DECIMAL(15,4),
  total_value_usd DECIMAL(15,2),
  total_value_cop DECIMAL(15,2),
  exchange_rate_at_quotation DECIMAL(15,4),
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_proceso','enviada_cliente','aprobada','rechazada','contrato','vencida')),
  status_history JSONB DEFAULT '[]',
  china_request_date TIMESTAMPTZ,
  china_response_date TIMESTAMPTZ,
  china_response_time_days INTEGER,
  client_sent_date TIMESTAMPTZ,
  client_response_date TIMESTAMPTZ,
  validity_days INTEGER DEFAULT 30,
  expiration_date DATE,
  incoterm TEXT,
  port_of_origin TEXT,
  port_of_destination TEXT,
  payment_conditions TEXT,
  delivery_time_days INTEGER,
  rejection_reason TEXT,
  items JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  linked_invoice_id UUID REFERENCES public.invoices(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- FK de invoices → quotations (referencia circular resuelta)
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_quotation_id_fkey
  FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);

-- =====================================================
-- TABLA 7: shipments (Embarques)
-- =====================================================
CREATE TABLE public.shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_number TEXT UNIQUE NOT NULL,
  vessel_id UUID NOT NULL REFERENCES public.vessels(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  commercial_id UUID NOT NULL REFERENCES public.profiles(id),
  invoice_id UUID REFERENCES public.invoices(id),
  bl_number TEXT,
  booking_number TEXT,
  container_numbers TEXT[],
  container_type TEXT,
  container_quantity INTEGER,
  seal_numbers TEXT[],
  port_of_loading TEXT NOT NULL,
  port_of_discharge TEXT NOT NULL,
  port_of_final_destination TEXT,
  etd DATE NOT NULL,
  atd DATE,
  eta DATE NOT NULL,
  ata DATE,
  eta_final_destination DATE,
  customs_clearance_date DATE,
  delivery_date DATE,
  cargo_description TEXT,
  cargo_weight_tons DECIMAL(15,2),
  cargo_volume_m3 DECIMAL(15,2),
  incoterm TEXT,
  freight_cost DECIMAL(15,2),
  freight_currency TEXT DEFAULT 'USD',
  insurance_cost DECIMAL(15,2),
  status TEXT DEFAULT 'reservado' CHECK (status IN ('reservado','en_puerto_origen','en_transito','en_puerto_destino','en_aduana','nacionalizado','entregado','con_novedad')),
  status_history JSONB DEFAULT '[]',
  current_location TEXT,
  tracking_url TEXT,
  documents JSONB DEFAULT '[]',
  incidents JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- FK de invoices → shipments
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_shipping_id_fkey
  FOREIGN KEY (shipping_id) REFERENCES public.shipments(id);

-- =====================================================
-- TABLA 8: packing_lists
-- =====================================================
CREATE TABLE public.packing_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pl_number TEXT UNIQUE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  issue_date DATE NOT NULL,
  items JSONB DEFAULT '[]',
  total_packages INTEGER,
  total_gross_weight DECIMAL(15,2),
  total_net_weight DECIMAL(15,2),
  weight_unit TEXT DEFAULT 'KG',
  total_volume DECIMAL(15,2),
  container_type TEXT,
  container_number TEXT,
  seal_number TEXT,
  shipping_marks TEXT,
  document_url TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER packing_lists_updated_at
  BEFORE UPDATE ON public.packing_lists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 9: production_reports
-- =====================================================
CREATE TABLE public.production_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_number TEXT UNIQUE NOT NULL,
  report_type TEXT,
  criteria JSONB DEFAULT '{}',
  data_snapshot JSONB DEFAULT '{}',
  generated_by UUID NOT NULL REFERENCES public.profiles(id),
  sent_to_china BOOLEAN DEFAULT false,
  sent_date TIMESTAMPTZ,
  sent_to_email TEXT,
  recipient_name TEXT,
  document_url TEXT,
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMPTZ,
  response_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER production_reports_updated_at
  BEFORE UPDATE ON public.production_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 10: reminders
-- =====================================================
CREATE TABLE public.reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('pago','contrato','anticipo','liberacion','motonave','produccion','custom')),
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baja','media','alta','urgente')),
  due_date TIMESTAMPTZ NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  frequency TEXT DEFAULT 'once' CHECK (frequency IN ('once','daily','weekly','monthly')),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  send_email BOOLEAN DEFAULT false,
  email_recipient TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  related_entity_type TEXT,
  related_entity_id UUID,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TABLA 11: audit_log (append-only)
-- =====================================================
CREATE TABLE public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT CHECK (action IN ('create','update','delete','status_change','login','logout','export','generate_document','send_email')),
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES para rendimiento
-- =====================================================
CREATE INDEX idx_clients_commercial ON public.clients(assigned_commercial_id);
CREATE INDEX idx_clients_active ON public.clients(is_active);
CREATE INDEX idx_clients_country ON public.clients(country);
CREATE INDEX idx_clients_type ON public.clients(client_type);

CREATE INDEX idx_quotations_client ON public.quotations(client_id);
CREATE INDEX idx_quotations_commercial ON public.quotations(commercial_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotations_product_line ON public.quotations(product_line);
CREATE INDEX idx_quotations_active ON public.quotations(is_active);
CREATE INDEX idx_quotations_created ON public.quotations(created_at);

CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_commercial ON public.invoices(commercial_id);
CREATE INDEX idx_invoices_status ON public.invoices(payment_status);
CREATE INDEX idx_invoices_active ON public.invoices(is_active);

CREATE INDEX idx_shipments_client ON public.shipments(client_id);
CREATE INDEX idx_shipments_commercial ON public.shipments(commercial_id);
CREATE INDEX idx_shipments_vessel ON public.shipments(vessel_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_active ON public.shipments(is_active);

CREATE INDEX idx_reminders_assigned ON public.reminders(assigned_to);
CREATE INDEX idx_reminders_due ON public.reminders(due_date);
CREATE INDEX idx_reminders_completed ON public.reminders(is_completed);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: profiles
-- =====================================================
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'directora')
  );

CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'directora')
    OR id = auth.uid()
  );

-- =====================================================
-- POLÍTICAS RLS: system_config
-- =====================================================
CREATE POLICY "system_config_select"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_config_update"
  ON public.system_config FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'directora'));

CREATE POLICY "system_config_insert"
  ON public.system_config FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'directora'));

-- =====================================================
-- POLÍTICAS RLS: clients
-- =====================================================
CREATE POLICY "clients_select"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR assigned_commercial_id = auth.uid()
  );

CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR assigned_commercial_id = auth.uid()
  );

CREATE POLICY "clients_update"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR assigned_commercial_id = auth.uid()
  );

-- =====================================================
-- POLÍTICAS RLS: vessels
-- =====================================================
CREATE POLICY "vessels_select"
  ON public.vessels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "vessels_insert"
  ON public.vessels FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

CREATE POLICY "vessels_update"
  ON public.vessels FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

-- =====================================================
-- POLÍTICAS RLS: quotations
-- =====================================================
CREATE POLICY "quotations_select"
  ON public.quotations FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR commercial_id = auth.uid()
  );

CREATE POLICY "quotations_insert"
  ON public.quotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "quotations_update"
  ON public.quotations FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR commercial_id = auth.uid()
  );

-- =====================================================
-- POLÍTICAS RLS: invoices
-- =====================================================
CREATE POLICY "invoices_select"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR commercial_id = auth.uid()
  );

CREATE POLICY "invoices_insert"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

CREATE POLICY "invoices_update"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

-- =====================================================
-- POLÍTICAS RLS: shipments
-- =====================================================
CREATE POLICY "shipments_select"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR commercial_id = auth.uid()
  );

CREATE POLICY "shipments_insert"
  ON public.shipments FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

CREATE POLICY "shipments_update"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR commercial_id = auth.uid()
  );

-- =====================================================
-- POLÍTICAS RLS: packing_lists
-- =====================================================
CREATE POLICY "packing_lists_select"
  ON public.packing_lists FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

CREATE POLICY "packing_lists_insert"
  ON public.packing_lists FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

CREATE POLICY "packing_lists_update"
  ON public.packing_lists FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista'));

-- =====================================================
-- POLÍTICAS RLS: production_reports
-- =====================================================
CREATE POLICY "production_reports_select"
  ON public.production_reports FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR generated_by = auth.uid()
  );

CREATE POLICY "production_reports_insert"
  ON public.production_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "production_reports_update"
  ON public.production_reports FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR generated_by = auth.uid()
  );

-- =====================================================
-- POLÍTICAS RLS: reminders
-- =====================================================
CREATE POLICY "reminders_select"
  ON public.reminders FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "reminders_insert"
  ON public.reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "reminders_update"
  ON public.reminders FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'directora', 'analista')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- =====================================================
-- POLÍTICAS RLS: audit_log
-- =====================================================
CREATE POLICY "audit_log_insert"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_log_select"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'directora'));

-- =====================================================
-- TRIGGER: Calcular china_response_time_days automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_china_response_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.china_request_date IS NOT NULL AND NEW.china_response_date IS NOT NULL THEN
    NEW.china_response_time_days = EXTRACT(DAY FROM (NEW.china_response_date - NEW.china_request_date));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotations_china_response_time
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.calculate_china_response_time();

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
