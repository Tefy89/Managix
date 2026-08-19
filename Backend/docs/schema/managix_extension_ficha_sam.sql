BEGIN;

CREATE TABLE ficha_diseno (
  id BIGINT PRIMARY KEY,
  proyecto_id BIGINT NOT NULL,
  nombre_coleccion VARCHAR(150), referencia VARCHAR(100), temporada VARCHAR(100), marca VARCHAR(150), linea VARCHAR(100), categoria VARCHAR(100), target VARCHAR(150), estilo VARCHAR(100), silueta VARCHAR(100), tallas VARCHAR(100), uso VARCHAR(150),
  fundamentacion TEXT, detalles_constructivos TEXT, acabados TEXT, tejido_referencial TEXT,
  paleta_colores JSONB,
  imagen_delantera_storage_key TEXT, imagen_espalda_storage_key TEXT, imagen_detalle_storage_key TEXT, imagen_tejido_storage_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_ficha_diseno_proyecto UNIQUE (proyecto_id),
  CONSTRAINT fk_ficha_diseno_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_ficha_diseno_textos CHECK (
    (nombre_coleccion IS NULL OR btrim(nombre_coleccion) <> '') AND (referencia IS NULL OR btrim(referencia) <> '') AND (temporada IS NULL OR btrim(temporada) <> '') AND (marca IS NULL OR btrim(marca) <> '') AND (linea IS NULL OR btrim(linea) <> '') AND (categoria IS NULL OR btrim(categoria) <> '') AND (target IS NULL OR btrim(target) <> '') AND (estilo IS NULL OR btrim(estilo) <> '') AND (silueta IS NULL OR btrim(silueta) <> '') AND (tallas IS NULL OR btrim(tallas) <> '') AND (uso IS NULL OR btrim(uso) <> '') AND (fundamentacion IS NULL OR btrim(fundamentacion) <> '') AND (detalles_constructivos IS NULL OR btrim(detalles_constructivos) <> '') AND (acabados IS NULL OR btrim(acabados) <> '') AND (tejido_referencial IS NULL OR btrim(tejido_referencial) <> '')
  ),
  CONSTRAINT ck_ficha_diseno_paleta CHECK (paleta_colores IS NULL OR jsonb_typeof(paleta_colores) = 'array'),
  CONSTRAINT ck_ficha_diseno_storage_keys CHECK ((imagen_delantera_storage_key IS NULL OR btrim(imagen_delantera_storage_key) <> '') AND (imagen_espalda_storage_key IS NULL OR btrim(imagen_espalda_storage_key) <> '') AND (imagen_detalle_storage_key IS NULL OR btrim(imagen_detalle_storage_key) <> '') AND (imagen_tejido_storage_key IS NULL OR btrim(imagen_tejido_storage_key) <> ''))
);

CREATE TABLE operacion_sam (
  id BIGINT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  sam_referencial NUMERIC(10,2) NOT NULL,
  estado estado_catalogo NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_operacion_sam_codigo CHECK (codigo ~ '^SAM-[0-9]{3,}$'),
  CONSTRAINT ck_operacion_sam_nombre CHECK (btrim(nombre) <> ''),
  CONSTRAINT ck_operacion_sam_sam CHECK (sam_referencial > 0)
);
CREATE UNIQUE INDEX uq_operacion_sam_codigo_ci ON operacion_sam (lower(codigo));
CREATE UNIQUE INDEX uq_operacion_sam_nombre_ci ON operacion_sam (lower(nombre));

CREATE TABLE version_costeo_operacion_sam (
  id BIGINT PRIMARY KEY,
  version_costeo_id BIGINT NOT NULL,
  operacion_sam_id BIGINT NOT NULL,
  sam_aplicado NUMERIC(10,2) NOT NULL,
  cantidad INTEGER NOT NULL,
  subtotal_minutos NUMERIC(12,2) NOT NULL,
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_vcos_version_operacion UNIQUE (version_costeo_id, operacion_sam_id),
  CONSTRAINT fk_vcos_version FOREIGN KEY (version_costeo_id) REFERENCES version_costeo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vcos_operacion FOREIGN KEY (operacion_sam_id) REFERENCES operacion_sam(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_vcos_sam_aplicado CHECK (sam_aplicado > 0),
  CONSTRAINT ck_vcos_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_vcos_subtotal_positivo CHECK (subtotal_minutos > 0),
  CONSTRAINT ck_vcos_subtotal_coherente CHECK (subtotal_minutos = sam_aplicado * cantidad),
  CONSTRAINT ck_vcos_observacion CHECK (observacion IS NULL OR btrim(observacion) <> '')
);
CREATE INDEX ix_vcos_operacion_sam_id ON version_costeo_operacion_sam (operacion_sam_id);

CREATE OR REPLACE FUNCTION fn_protect_costeo_lines()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_estado estado_version_costeo; v_version_id BIGINT;
BEGIN
  v_version_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.version_costeo_id ELSE NEW.version_costeo_id END;
  SELECT estado INTO v_estado FROM version_costeo WHERE id = v_version_id;
  IF v_estado IS DISTINCT FROM 'BORRADOR' THEN
    RAISE EXCEPTION 'No se pueden modificar ni eliminar lineas de una VERSION_COSTEO que no esta en BORRADOR';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER trg_vcos_proteger_historial BEFORE INSERT OR UPDATE OR DELETE ON version_costeo_operacion_sam FOR EACH ROW EXECUTE FUNCTION fn_protect_costeo_lines();

COMMIT;
