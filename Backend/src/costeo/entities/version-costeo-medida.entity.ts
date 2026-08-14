import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { VersionCosteo } from './version-costeo.entity';
import { TipoPrendaMedida } from '../../catalogos/entities/catalogos.entities';
@Entity({ name: 'version_costeo_medida' })
export class VersionCosteoMedida {
  @PrimaryColumn({ type: 'bigint' }) id: string;
  @Column({ name: 'version_costeo_id', type: 'bigint' }) versionCosteoId: string;
  @Column({ name: 'tipo_prenda_medida_id', type: 'bigint' }) tipoPrendaMedidaId: string;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) valor: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @ManyToOne(() => VersionCosteo) @JoinColumn({ name: 'version_costeo_id' }) versionCosteo: VersionCosteo;
  @ManyToOne(() => TipoPrendaMedida) @JoinColumn({ name: 'tipo_prenda_medida_id' }) tipoPrendaMedida: TipoPrendaMedida;
}
