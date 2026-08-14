import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

const transformNullableNumber = ({ value }: { value: unknown }): unknown =>
  value === null || value === undefined || value === '' ? value : Number(value);

export class CreateVersionCosteoTelaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  telaId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidadMetros: number;

  @IsOptional()
  @Transform(transformNullableNumber)
  @IsNumber()
  @IsPositive()
  cantidadMetrosSugerida?: number | null;

  @IsOptional()
  @Transform(transformNullableNumber)
  @IsInt()
  @IsPositive()
  reglaConsumoTelaId?: number | null;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class UpdateVersionCosteoTelaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidadMetros?: number;

  @IsOptional()
  @Transform(transformNullableNumber)
  @IsNumber()
  @IsPositive()
  cantidadMetrosSugerida?: number | null;

  @IsOptional()
  @Transform(transformNullableNumber)
  @IsInt()
  @IsPositive()
  reglaConsumoTelaId?: number | null;

  @IsOptional()
  @IsString()
  observacion?: string;
}
