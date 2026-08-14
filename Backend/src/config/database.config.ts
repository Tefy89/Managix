import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const requiredEnv = (configService: ConfigService, key: string): string => {
  const value = configService.get<string>(key)?.trim();

  if (!value) {
    throw new Error(`La variable de entorno ${key} es obligatoria.`);
  }

  return value;
};

/** Configuración exclusiva de conexión; no modifica el esquema existente. */
export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: requiredEnv(configService, 'DB_HOST'),
  port: Number(configService.get<string>('DB_PORT') ?? 5432),
  username: requiredEnv(configService, 'DB_USERNAME'),
  password: requiredEnv(configService, 'DB_PASSWORD'),
  database: requiredEnv(configService, 'DB_NAME'),
  autoLoadEntities: true,
  entities: [],
  synchronize: false,
  migrationsRun: false,
  logging: false,
});
