import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { OrdenProduccionEtapa } from './orden-produccion-etapa.entity';
export enum ResultadoRevision { OBSERVADA = 'OBSERVADA', APROBADA = 'APROBADA' }
@Entity({ name: 'revision_etapa' })
export class RevisionEtapa { @PrimaryColumn({ type: 'bigint' }) id: string; @Column({ name: 'orden_produccion_etapa_id', type: 'bigint' }) ordenProduccionEtapaId: string; @Column({ name: 'docente_id', type: 'bigint' }) docenteId: string; @Column({ name: 'resultado_revision', type: 'enum', enum: ResultadoRevision, enumName: 'resultado_revision' }) resultadoRevision: ResultadoRevision; @Column({ type: 'text', nullable: true }) observacion: string | null; @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date; @ManyToOne(() => OrdenProduccionEtapa) @JoinColumn({ name: 'orden_produccion_etapa_id' }) etapa: OrdenProduccionEtapa; @ManyToOne(() => Usuario) @JoinColumn({ name: 'docente_id' }) docente: Usuario; }
