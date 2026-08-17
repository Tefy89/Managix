import { IsOptional, IsString, MaxLength } from 'class-validator';
export class UploadEvidenciaDto { @IsOptional() @IsString() @MaxLength(2000) descripcion?: string; }
