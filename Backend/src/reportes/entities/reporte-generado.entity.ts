import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { VersionCosteo } from '../../costeo/entities/version-costeo.entity';
import { OrdenProduccion } from '../../produccion/entities/orden-produccion.entity';

export enum TipoReporte { COTIZACION = 'COTIZACION', ORDEN_PRODUCCION = 'ORDEN_PRODUCCION', FICHA_TECNICA = 'FICHA_TECNICA', REPORTE_PROYECTO = 'REPORTE_PROYECTO' }

@Entity({ name: 'reporte_generado' })
export class ReporteGenerado {
  @PrimaryColumn({ type: 'bigint' }) id: string;
  @Column({ name: 'proyecto_id', type: 'bigint' }) proyectoId: string;
  @Column({ name: 'generado_por_usuario_id', type: 'bigint' }) generadoPorUsuarioId: string;
  @Column({ name: 'tipo_reporte', type: 'enum', enum: TipoReporte, enumName: 'tipo_reporte' }) tipoReporte: TipoReporte;
  @Column({ name: 'version_costeo_id', type: 'bigint', nullable: true }) versionCosteoId: string | null;
  @Column({ name: 'orden_produccion_id', type: 'bigint', nullable: true }) ordenProduccionId: string | null;
  @Column({ name: 'storage_key', type: 'text' }) storageKey: string;
  @Column({ name: 'nombre_archivo', type: 'varchar' }) nombreArchivo: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @ManyToOne(() => Proyecto) @JoinColumn({ name: 'proyecto_id' }) proyecto: Proyecto;
  @ManyToOne(() => Usuario) @JoinColumn({ name: 'generado_por_usuario_id' }) generadoPor: Usuario;
  @ManyToOne(() => VersionCosteo, { nullable: true }) @JoinColumn({ name: 'version_costeo_id' }) versionCosteo: VersionCosteo | null;
  @ManyToOne(() => OrdenProduccion, { nullable: true }) @JoinColumn({ name: 'orden_produccion_id' }) ordenProduccion: OrdenProduccion | null;
}