import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsPositive, ValidateNested } from 'class-validator';
export class MedidaVersionDto { @Type(() => Number) @IsInt() @IsPositive() tipoPrendaMedidaId: number; @Type(() => Number) @IsNumber() @IsPositive() valor: number; }
export class GuardarMedidasDto { @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => MedidaVersionDto) medidas: MedidaVersionDto[]; }
