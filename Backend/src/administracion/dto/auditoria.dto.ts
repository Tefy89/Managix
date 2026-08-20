import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { AccionAuditoria } from '../entities/auditoria.entity';

export class QueryAuditoriaDto {
  @IsOptional() @IsString() @MaxLength(100) modulo?: string;
  @IsOptional() @IsEnum(AccionAuditoria) accion?: AccionAuditoria;
  @IsOptional() @IsString() @Matches(/^\d+$/) usuarioId?: string;
  @IsOptional() @IsString() @MaxLength(100) entidad?: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) entidadId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaDesde?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaHasta?: string;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}