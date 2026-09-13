import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
export class ActualizarUtilidadDto { @Type(() => Number) @IsNumber() @Min(0) porcentajeUtilidad: number; }
