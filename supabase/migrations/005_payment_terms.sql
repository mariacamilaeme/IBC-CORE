-- 005: Término / vencimiento de pago especial (columna JPB del Excel STATUS)
-- Ejemplos: "60 días BL", "60 días BL - 7 NOV", "Fecha de vencimiento 4 diciembre".
-- Ejecutar en Supabase → SQL Editor → Run.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_terms text;

COMMENT ON COLUMN public.contracts.payment_terms IS
  'Término/vencimiento de pago especial (columna JPB del Excel STATUS). Si trae fecha, los reportes de cartera la usan como fecha de vencimiento del pago; si no, el vencimiento es el deadline de la motonave (ETA - 15 días).';
