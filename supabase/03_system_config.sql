-- =====================================================
-- QUERY 3: Tabla system_config
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
