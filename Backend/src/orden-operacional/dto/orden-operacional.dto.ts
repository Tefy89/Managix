import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCatalogo } from '../../auth/entities/rol.entity';
export class CreateMaquinariaDto { @Matches(/^MAQ-\d{3,}$/) codigo: string; @IsString() @IsNotEmpty() nombre: string; @IsNumber() @Min(0) factorConsumoHilo: number; }
export class UpdateMaquinariaDto { @IsOptional() @Matches(/^MAQ-\d{3,}$/) codigo?: string; @IsOptional() @IsString() @IsNotEmpty() nombre?: string; @IsOptional() @IsNumber() @Min(0) factorConsumoHilo?: number; }
export class EstadoMaquinariaDto { @IsEnum(EstadoCatalogo) estado: EstadoCatalogo; }
export class CreateDetalleOrdenDto { @IsString() @IsNotEmpty() operacion: string; @IsOptional() @IsString() descripcion?: string; @IsInt() @Min(1) maquinariaId: number; @IsNumber() @Min(0.0001) tiempoSegundos: number; @IsNumber() @Min(0) costuraCm: number; }
export class UpdateDetalleOrdenDto { @IsOptional() @IsString() @IsNotEmpty() operacion?: string; @IsOptional() @IsString() descripcion?: string; @IsOptional() @IsInt() @Min(1) maquinariaId?: number; @IsOptional() @IsNumber() @Min(0.0001) tiempoSegundos?: number; @IsOptional() @IsNumber() @Min(0) costuraCm?: number; }
export class ReordenarDetalleItemDto { @IsInt() @Min(1) id: number; @IsInt() @Min(1) ordenVisualizacion: number; }
export class ReordenarOrdenDto { @IsArray() @ValidateNested({ each: true }) @Type(() => ReordenarDetalleItemDto) detalles: ReordenarDetalleItemDto[]; }