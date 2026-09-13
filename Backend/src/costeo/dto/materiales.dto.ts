import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CrearTelaDesdeCosteoDto {
  @IsString() @IsNotEmpty() @MaxLength(150) nombre: string;
  @Type(() => Number) @IsNumber() @IsPositive() anchoCm: number;
  @Type(() => Number) @IsNumber() @IsPositive() precioMetro: number;
  @IsOptional() @IsString() descripcion?: string;
}

export class CrearInsumoDesdeCosteoDto {
  @IsString() @IsNotEmpty() @MaxLength(150) nombre: string;
  @IsString() @IsNotEmpty() @MaxLength(30) unidadMedida: string;
  @Type(() => Number) @IsNumber() @IsPositive() precioUnitario: number;
  @IsOptional() @IsString() descripcion?: string;
}

export class ActualizarConfiguracionHiloDto {
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() precioPresentacionHilo?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() metrosPresentacionHilo?: number;
}
