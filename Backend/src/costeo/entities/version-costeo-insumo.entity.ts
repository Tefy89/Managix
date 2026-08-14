import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Insumo } from '../../catalogos/entities/catalogos.entities';
import { VersionCosteo } from './version-costeo.entity';

@Entity({ name: 'version_costeo_insumo' })
export class VersionCosteoInsumo {
  @PrimaryColumn({ type: 'bigint' }) id: string;
  @Column({ name: 'version_costeo_id', type: 'bigint' }) versionCosteoId: string;
  @Column({ name: 'insumo_id', type: 'bigint' }) insumoId: string;
  @Column({ type: 'numeric', precision: 12, scale: 3 }) cantidad: number;
  @Column({ name: 'unidad_medida_aplicada', type: 'varchar', length: 30 }) unidadMedidaAplicada: string;
  @Column({ name: 'precio_unitario_aplicado', type: 'numeric', precision: 12, scale: 2 }) precioUnitarioAplicado: number;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) subtotal: number;
  @Column({ type: 'text', nullable: true }) observacion: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;

  @ManyToOne(() => VersionCosteo)
  @JoinColumn({ name: 'version_costeo_id' })
  versionCosteo: VersionCosteo;

  @ManyToOne(() => Insumo)
  @JoinColumn({ name: 'insumo_id' })
  insumo: Insumo;
}
