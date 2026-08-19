import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
export class CreateOperacionSamDto { @IsString() @Matches(/^SAM-[0-9]{3,}$/) codigo:string; @IsString() @IsNotEmpty() nombre:string; @IsOptional() @IsString() descripcion?:string; @IsNumber() @Min(0.01) samReferencial:number; }
export class UpdateOperacionSamDto { @IsOptional() @IsString() @Matches(/^SAM-[0-9]{3,}$/) codigo?:string; @IsOptional() @IsString() @IsNotEmpty() nombre?:string; @IsOptional() @IsString() descripcion?:string; @IsOptional() @IsNumber() @Min(0.01) samReferencial?:number; }
export class EstadoSamDto { @IsString() @Matches(/^(ACTIVO|INACTIVO)$/) estado:string; }
export class CreateLineaSamDto { @IsInt() @Min(1) operacionSamId:number; @IsNumber() @Min(0.01) cantidad:number; @IsOptional() @IsString() observacion?:string; }
export class UpdateLineaSamDto { @IsOptional() @IsNumber() @Min(0.01) cantidad?:number; @IsOptional() @IsString() observacion?:string; }