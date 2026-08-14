import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'; import { EstadoCatalogo } from '../../auth/entities/rol.entity';
export class CreateProyectoDto { @IsString() @IsNotEmpty() nombre:string; @IsOptional() @IsString() descripcion?:string; }
export class UpdateProyectoDto { @IsOptional() @IsString() @IsNotEmpty() nombre?:string; @IsOptional() @IsString() descripcion?:string; }
export class EstadoProyectoDto { @IsEnum(EstadoCatalogo) estado:EstadoCatalogo; }
