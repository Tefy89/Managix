-- Fase 4: snapshot y cálculo de hilo por versión de costeo.
-- DDL manual controlado; TypeORM conserva synchronize=false y migrationsRun=false.
BEGIN;

ALTER TABLE public.version_costeo_calculo_base
  ADD COLUMN precio_presentacion_hilo NUMERIC(14,6) NOT NULL DEFAULT 2.20,
  ADD COLUMN metros_presentacion_hilo NUMERIC(14,4) NOT NULL DEFAULT 10000,
  ADD COLUMN hilo_total_metros NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN precio_hilo_por_metro NUMERIC(18,10) NOT NULL DEFAULT 0,
  ADD COLUMN subtotal_hilo NUMERIC(18,10) NOT NULL DEFAULT 0,
  ADD CONSTRAINT ck_vccb_hilo_config CHECK (precio_presentacion_hilo > 0 AND metros_presentacion_hilo > 0),
  ADD CONSTRAINT ck_vccb_hilo_resultados CHECK (hilo_total_metros >= 0 AND precio_hilo_por_metro >= 0 AND subtotal_hilo >= 0);

COMMIT;
