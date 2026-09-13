import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator';

export class ActualizarActividadCalculoDto {
  @IsString()
  @Matches(/^(PATRONAJE|DESPIECE|CORTE|CONTACTA_TEMA|INVESTIGACION|BOCETAJE|ILUSTRACION|SELECCION|FICHAS_TECNICAS)$/)
  codigo: string;

  @IsNumber()
  @Min(0)
  horas: number;
}

export class ActualizarCalculosBaseDto {
  @IsOptional() @IsNumber() @Min(0.01) sbu?: number;
  @IsOptional() @IsInt() @Min(1) numeroOperarias?: number;
  @IsOptional() @IsNumber() @Min(0) sueldoPersonalAdministrativo?: number;
  @IsOptional() @IsNumber() @Min(0) variosMoi?: number;
  @IsOptional() @IsNumber() @Min(0) gastosGenerales?: number;
  @IsOptional() @IsNumber() @Min(0) arriendo?: number;
  @IsOptional() @IsNumber() @Min(0) papeleria?: number;
  @IsOptional() @IsNumber() @Min(0) higiene?: number;
  @IsOptional() @IsNumber() @Min(0) cafeteria?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ActualizarActividadCalculoDto)
  actividades?: ActualizarActividadCalculoDto[];
}
