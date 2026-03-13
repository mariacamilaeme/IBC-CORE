-- =====================================================
-- IBC CORE — SEED DATA
-- Ejecutar DESPUÉS del schema en el Editor SQL de Supabase
-- =====================================================

-- Configuración inicial del sistema
INSERT INTO public.system_config (
  company_name,
  company_tax_id,
  company_address,
  company_city,
  company_country,
  company_phone,
  company_email,
  default_currency,
  exchange_rate_usd_cop,
  invoice_prefix,
  invoice_next_number,
  quotation_prefix,
  quotation_next_number,
  packing_list_prefix,
  packing_list_next_number,
  shipment_prefix,
  shipment_next_number,
  fiscal_data,
  document_templates,
  email_settings
) VALUES (
  'IBC Steel Group',
  '901234567-8',
  'Calle 100 #45-67 Oficina 801',
  'Bogotá',
  'Colombia',
  '+57 601 123 4567',
  'info@ibcsteelgroup.com',
  'USD',
  4150.00,
  'FAC-',
  1,
  'COT-',
  1,
  'PL-',
  1,
  'EMB-',
  1,
  '{"nit": "901234567-8", "razon_social": "IBC Steel Group S.A.S.", "regimen": "Responsable de IVA", "actividad_economica": "4669"}',
  '{}',
  '{}'
);

-- Motonaves de ejemplo
INSERT INTO public.vessels (vessel_name, imo_number, flag, shipping_line, vessel_type, capacity_tons) VALUES
  ('MSC Gulsun', 'IMO9839430', 'Panama', 'MSC', 'Portacontenedores', 228000),
  ('CMA CGM Jacques Saade', 'IMO9839284', 'France', 'CMA CGM', 'Portacontenedores', 221000),
  ('Ever Given', 'IMO9811000', 'Panama', 'Evergreen', 'Portacontenedores', 200000),
  ('HMM Algeciras', 'IMO9863297', 'Panama', 'HMM', 'Portacontenedores', 228000),
  ('COSCO Shipping Universe', 'IMO9795610', 'Hong Kong', 'COSCO', 'Portacontenedores', 198000);

-- =====================================================
-- FIN DEL SEED
-- =====================================================
