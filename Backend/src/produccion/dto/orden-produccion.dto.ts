import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoOrdenProduccion } from '../entities/orden-produccion.entity';
export class CreateOrdenProduccionDto { @IsOptional() @IsString() @MaxLength(2000) observacion?: string; }
export class ListOrdenesProduccionDto { @IsOptional() @IsEnum(EstadoOrdenProduccion) estado?: EstadoOrdenProduccion; @IsOptional() @IsString() proyecto?: string; @IsOptional() @IsString() @MaxLength(150) search?: string; }
