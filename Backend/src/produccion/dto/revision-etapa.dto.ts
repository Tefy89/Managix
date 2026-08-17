import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResultadoRevision } from '../entities/revision-etapa.entity';
export class CreateRevisionEtapaDto { @IsIn([ResultadoRevision.OBSERVADA, ResultadoRevision.APROBADA]) resultado: ResultadoRevision; @IsOptional() @IsString() @MaxLength(2000) observacion?: string; }
export class ListRevisionEtapasDto { @IsOptional() @IsIn(['SIN_REVISAR', ResultadoRevision.OBSERVADA, ResultadoRevision.APROBADA]) estado?: 'SIN_REVISAR' | ResultadoRevision; @IsOptional() @IsString() estudiante?: string; @IsOptional() @IsString() proyecto?: string; }
