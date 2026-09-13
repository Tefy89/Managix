# Backend de MANAGIX

API REST desarrollada con NestJS, TypeORM y PostgreSQL para la plataforma académica MANAGIX.

La documentación general, instalación completa, arquitectura, seguridad y contexto académico se encuentran en el [README principal](../README.md).

## Comandos

```bash
npm install
npm run start:dev
npm run build
npm test -- --runInBand
```

## Configuración local

Copie `.env.example` como `.env` y complete las variables de PostgreSQL y JWT con valores locales. El archivo `.env` no se versiona.

La conexión se configura con `synchronize=false` y `migrationsRun=false`; el Backend no crea ni modifica automáticamente el esquema PostgreSQL.