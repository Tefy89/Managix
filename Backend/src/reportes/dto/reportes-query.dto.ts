import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TipoReporte } from '../entities/reporte-generado.entity';
export class ReportesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) proyectoId?: number;
  @IsOptional() @IsEnum(TipoReporte) tipo?: TipoReporte;
}