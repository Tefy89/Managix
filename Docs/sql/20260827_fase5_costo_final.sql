-- Fase 5: snapshots del cuadro 8 y costo final por versión.
BEGIN;

ALTER TABLE public.version_costeo_calculo_base
  ADD COLUMN tiempo_estandar_aplicado NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_mod_prenda NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_moi_prenda NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_generales_prenda NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_patronaje_corte_prenda NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_diseno_prenda NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_materiales NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN costo_unitario NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN porcentaje_utilidad NUMERIC(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN valor_utilidad NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN subtotal_venta NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN porcentaje_iva_aplicado NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  ADD COLUMN valor_iva NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN pvp NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD CONSTRAINT ck_vccb_utilidad CHECK (porcentaje_utilidad >= 0),
  ADD CONSTRAINT ck_vccb_iva_15 CHECK (porcentaje_iva_aplicado = 15),
  ADD CONSTRAINT ck_vccb_costo_final_no_negativo CHECK (
    tiempo_estandar_aplicado >= 0 AND costo_mod_prenda >= 0 AND costo_moi_prenda >= 0 AND costo_generales_prenda >= 0 AND
    costo_patronaje_corte_prenda >= 0 AND costo_diseno_prenda >= 0 AND costo_materiales >= 0 AND costo_unitario >= 0 AND
    valor_utilidad >= 0 AND subtotal_venta >= 0 AND valor_iva >= 0 AND pvp >= 0
  );

COMMIT;
