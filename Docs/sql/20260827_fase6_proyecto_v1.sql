-- Fase 6: una versión inicial puede seleccionar su prenda posteriormente.
BEGIN;
ALTER TABLE public.version_costeo ALTER COLUMN tipo_prenda_id DROP NOT NULL;
COMMIT;
