import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { VersionCosteo } from '../../costeo/entities/version-costeo.entity';

export enum EstadoOrdenProduccion { PENDIENTE = 'PENDIENTE', EN_PROCESO = 'EN_PROCESO', FINALIZADA = 'FINALIZADA', CANCELADA = 'CANCELADA' }
@Entity({ name: 'orden_produccion' })
export class OrdenProduccion {
  @PrimaryColumn({ type: 'bigint' }) id: string;
  @Column({ name: 'version_costeo_id', type: 'bigint' }) versionCosteoId: string;
  @Column({ type: 'varchar' }) codigo: string;
  @Column({ type: 'enum', enum: EstadoOrdenProduccion, enumName: 'estado_orden_produccion' }) estado: EstadoOrdenProduccion;
  @Column({ name: 'fecha_inicio', type: 'timestamptz', nullable: true }) fechaInicio: Date | null;
  @Column({ name: 'fecha_fin', type: 'timestamptz', nullable: true }) fechaFin: Date | null;
  @Column({ type: 'text', nullable: true }) observacion: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @OneToOne(() => VersionCosteo) @JoinColumn({ name: 'version_costeo_id' }) versionCosteo: VersionCosteo;
}
