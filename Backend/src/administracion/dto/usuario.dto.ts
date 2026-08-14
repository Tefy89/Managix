import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'; import { EstadoUsuario } from '../../auth/entities/usuario.entity';
export class CreateUsuarioDto { @IsString() @IsNotEmpty() @MaxLength(100) nombre:string; @IsString() @IsNotEmpty() @MaxLength(100) apellido:string; @IsEmail() correo:string; @IsString() @MinLength(8) password:string; @IsString() @IsNotEmpty() rolId:string; @IsOptional() @IsEnum(EstadoUsuario) estado?:EstadoUsuario; }
export class UpdateUsuarioDto { @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) nombre?:string; @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) apellido?:string; @IsOptional() @IsString() @IsNotEmpty() rolId?:string; }
export class UpdateEstadoDto { @IsEnum(EstadoUsuario) estado:EstadoUsuario; }
export class ResetPasswordDto { @IsString() @MinLength(8) password:string; }
