-- =====================================================
-- PAYMENTS MODULE - Database Schema & Seed Data
-- Run this in Supabase SQL Editor
-- =====================================================

-- ─── 1. SUPPLIERS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  bank_name TEXT,
  account_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage suppliers"
  ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. PAYMENTS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('reporte_pagos', 'abonos', 'pte_saldos', 'impo')),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  client TEXT,
  description TEXT,
  china_sales_contract TEXT,
  usd_invoice NUMERIC(15,2),
  deposit NUMERIC(15,2),
  deposit_percentage NUMERIC(5,4),
  balance_to_pay NUMERIC(15,2),
  payment_colombia TEXT,
  account_info TEXT,
  client_payment NUMERIC(15,2),
  remarks TEXT,
  numeral_cambiario TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_category ON payments(category);
CREATE INDEX idx_payments_supplier ON payments(supplier_id);
CREATE INDEX idx_payments_status ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =====================================================
-- 3. SEED DATA - Suppliers
-- =====================================================

INSERT INTO suppliers (name, bank_name, account_details) VALUES
  ('IBC(HONGKONG)GROUP CO.,LIMITED (DSB BANK)', 'DSB BANK', 'BENEFICIARY NAME: IBC(HONGKONG)GROUP CO.,LIMITED
BENEFICIARY BANK: DBS BANK (HONG KONG) LIMITED'),

  ('IBC METAL PTE.LTD', NULL, 'BENEFICIARY NAME: IBC METAL PTE. LTD
BENEFICIARY BANK: DBS BANK LTD'),

  ('PHOENIX STEEL PROCESSING CO.,LTD', NULL, 'BENEFICIARY NAME: PHOENIX STEEL PROCESSING CO.,LTD'),

  ('IBC(HONGKONG)GROUP CO.,LIMITED (JP MORGAN)', 'JP MORGAN', 'BENEFICIARY NAME: IBC(HONGKONG)GROUP CO.,LIMITED
BANK: JP MORGAN'),

  ('IBC (TIANJIN) INDUSTRIAL CO., LTD', NULL, 'BENEFICIARY NAME: IBC (TIANJIN) INDUSTRIAL CO., LTD'),

  ('LONGTAIDI TECH GROUP LIMITED', NULL, 'LONGTAIDI TECH GROUP LIMITED'),

  ('IBC STEEL GROUP SAS', 'SCOTIABANK COLPATRIA', 'IBC STEEL GROUP SAS
NIT: 900.986.039-2
CUENTA DE AHORROS SCOTIABANK COLPATRIA'),

  ('PAGOS A TERCEROS', NULL, 'Pagos a terceros / proveedores externos')
ON CONFLICT (name) DO NOTHING;


-- =====================================================
-- 4. SEED DATA - Payments (from Excel)
-- =====================================================

-- ─── REPORTE DE PAGOS - IBC METAL PTE.LTD ───────────
INSERT INTO payments (category, supplier_id, client, description, china_sales_contract, usd_invoice, deposit, balance_to_pay, client_payment, remarks, status)
VALUES
  ('reporte_pagos',
   (SELECT id FROM suppliers WHERE name = 'IBC METAL PTE.LTD'),
   'ACEROS Y MALLAS', 'HR STRIPS', 'IS-2510116-174', 20909.32, 13000.00, NULL, 13000.00,
   'PENDIENTE POR PAGAR POR PARTE DEL CLIENTE USD3254', 'partial'),

  ('reporte_pagos',
   (SELECT id FROM suppliers WHERE name = 'IBC METAL PTE.LTD'),
   'FERROSVEL', 'ANGLES, FLAT BARS', 'IS-2509147-157', 162702.33, 130453.63, 32248.70, 133741.32,
   'PAGO SALDO', 'partial'),

  ('reporte_pagos',
   (SELECT id FROM suppliers WHERE name = 'IBC METAL PTE.LTD'),
   'VICTORIA STEEL', 'WIRE ROD', 'IS-2510150-176', 33223.20, 30498.20, 2725.00, 31393.56,
   'PAGO SALDO', 'partial');

-- ─── REPORTE DE PAGOS - PHOENIX STEEL ────────────────
INSERT INTO payments (category, supplier_id, client, description, china_sales_contract, usd_invoice, deposit_percentage, balance_to_pay, client_payment, remarks, status)
VALUES
  ('reporte_pagos',
   (SELECT id FROM suppliers WHERE name = 'PHOENIX STEEL PROCESSING CO.,LTD'),
   'FABRICACIONES MECANICAS (DISFEGU)', 'FORKLIFT', 'PT-2601144-011', 32600.00, 0.40, 13040.00, 23160.00,
   'PAGO ANTICIPO', 'partial');

-- ─── REPORTE DE PAGOS - DEVOLUCIONES ─────────────────
INSERT INTO payments (category, supplier_id, client, description, china_sales_contract, usd_invoice, deposit, balance_to_pay, client_payment, remarks, status)
VALUES
  ('reporte_pagos',
   (SELECT id FROM suppliers WHERE name = 'PAGOS A TERCEROS'),
   'FINKARGO - TRAFILADOS Y MALLAS', 'Devolución por incremento', NULL, NULL, NULL, 32580.00, NULL,
   'DEVOLUCIONES', 'pending');

-- ─── ABONOS - IBC(HONGKONG) ─────────────────────────
INSERT INTO payments (category, supplier_id, client, description, china_sales_contract, usd_invoice, deposit, client_payment, remarks, status)
VALUES
  ('abonos',
   (SELECT id FROM suppliers WHERE name = 'IBC(HONGKONG)GROUP CO.,LIMITED (DSB BANK)'),
   'CONCREACEROS', 'HOT ROLLED ROUND BAR', 'IK-250113-010', 140918.95, 100000.00, 100000.00,
   'ABONO DEL CLIENTE 11 DE JUNIO', 'partial'),

  ('abonos',
   (SELECT id FROM suppliers WHERE name = 'IBC(HONGKONG)GROUP CO.,LIMITED (DSB BANK)'),
   'FERROSVEL', 'HOLLOW SECTION', 'IK-2502147-034', 559333.60, 231324.40, 231324.40,
   'ABONO DEL CLIENTE 11 DE JUNIO', 'partial');

-- ─── ABONOS - IBC METAL ─────────────────────────────
INSERT INTO payments (category, supplier_id, client, description, china_sales_contract, usd_invoice, deposit, client_payment, remarks, status)
VALUES
  ('abonos',
   (SELECT id FROM suppliers WHERE name = 'IBC METAL PTE.LTD'),
   'INDUASIS', 'WIRE ROD', 'IS-2405141-050', NULL, NULL, 10000.00,
   'ABONO AL CONTRATO #2 / AUN NO TENEMOS FACTURA', 'partial');

-- ─── PTE SALDOS ─────────────────────────────────────
INSERT INTO payments (category, supplier_id, client, description, usd_invoice, deposit, balance_to_pay, remarks, status)
VALUES
  ('pte_saldos',
   (SELECT id FROM suppliers WHERE name = 'IBC(HONGKONG)GROUP CO.,LIMITED (JP MORGAN)'),
   'SALDO PENDIENTE DE PAGO DE MAS', NULL, NULL, 1164.00, NULL,
   'Saldo pendiente de pago de más', 'pending');

-- ─── IMPO - PHOENIX STEEL ────────────────────────────
INSERT INTO payments (category, supplier_id, china_sales_contract, usd_invoice, deposit_percentage, balance_to_pay, numeral_cambiario, remarks, status)
VALUES
  ('impo',
   (SELECT id FROM suppliers WHERE name = 'PHOENIX STEEL PROCESSING CO.,LTD'),
   'PT-260123-008', 52000.00, 0.10, 5200.00, '2017',
   NULL, 'pending'),

  ('impo',
   (SELECT id FROM suppliers WHERE name = 'PHOENIX STEEL PROCESSING CO.,LTD'),
   'PT-260101-005', 51136.00, 0.10, 5113.60, '2017',
   NULL, 'pending');


-- =====================================================
-- Done! All tables created and seed data inserted.
-- =====================================================
