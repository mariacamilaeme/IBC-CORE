-- 004: Indicador "Incidente de Seguridad" (columna INCIDENTE DE SEGURIDAD del Excel STATUS)
-- Ejecutar en Supabase → SQL Editor → Run.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS safety_incident text;

COMMENT ON COLUMN public.contracts.safety_incident IS
  'Incidente de seguridad del embarque (SI/NO u observación). Viene de la columna INCIDENTE DE SEGURIDAD del Excel STATUS.';
