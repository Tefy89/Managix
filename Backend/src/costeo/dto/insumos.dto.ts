import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
export class CreateVersionCosteoInsumoDto {
  @Type(() => Number) @IsInt() @IsPositive() insumoId: number;
  @Type(() => Number) @IsNumber() @IsPositive() cantidad: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() precioUnitarioAplicado?: number;
  @IsOptional() @IsString() observacion?: string;
}
export class UpdateVersionCosteoInsumoDto {
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() cantidad?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() precioUnitarioAplicado?: number;
  @IsOptional() @IsString() observacion?: string;
}