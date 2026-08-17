import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { OrdenProduccionEtapa } from './orden-produccion-etapa.entity';
@Entity({ name: 'evidencia_etapa' })
export class EvidenciaEtapa {
  @PrimaryColumn({ type: 'bigint' }) id: string;
  @Column({ name: 'orden_produccion_etapa_id', type: 'bigint' }) ordenProduccionEtapaId: string;
  @Column({ name: 'subido_por_usuario_id', type: 'bigint' }) subidoPorUsuarioId: string;
  @Column({ name: 'nombre_original_archivo' }) nombreOriginalArchivo: string;
  @Column({ name: 'storage_key', type: 'text' }) storageKey: string;
  @Column({ name: 'mime_type' }) mimeType: string;
  @Column({ name: 'tamano_bytes', type: 'bigint' }) tamanoBytes: string;
  @Column({ type: 'text', nullable: true }) descripcion: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @ManyToOne(() => OrdenProduccionEtapa) @JoinColumn({ name: 'orden_produccion_etapa_id' }) etapa: OrdenProduccionEtapa;
  @ManyToOne(() => Usuario) @JoinColumn({ name: 'subido_por_usuario_id' }) subidoPor: Usuario;
}
