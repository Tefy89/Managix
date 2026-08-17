import { IsString, MaxLength } from 'class-validator';
export class UpdateObservacionEtapaDto { @IsString() @MaxLength(2000) observacionEstudiante: string; }
