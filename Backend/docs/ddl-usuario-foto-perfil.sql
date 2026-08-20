-- UX-01: ampliación autorizada para la foto de perfil del usuario.
-- PostgreSQL almacena únicamente la clave de almacenamiento; el archivo se guarda en uploads/perfiles/<usuarioId>/.
ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS foto_perfil_storage_key TEXT NULL;
ALTER TABLE public.usuario DROP CONSTRAINT IF EXISTS ck_usuario_foto_perfil_storage_key;
ALTER TABLE public.usuario ADD CONSTRAINT ck_usuario_foto_perfil_storage_key CHECK (foto_perfil_storage_key IS NULL OR length(trim(foto_perfil_storage_key)) > 0);