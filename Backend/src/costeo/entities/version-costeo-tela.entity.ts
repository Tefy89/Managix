import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ReglaConsumoTela, Tela } from '../../catalogos/entities/catalogos.entities';
import { VersionCosteo } from './version-costeo.entity';

@Entity({ name: 'version_costeo_tela' })
export class VersionCosteoTela {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'version_costeo_id', type: 'bigint' })
  versionCosteoId: string;

  @Column({ name: 'tela_id', type: 'bigint' })
  telaId: string;

  @Column({ name: 'cantidad_metros_sugerida', type: 'numeric', nullable: true })
  cantidadMetrosSugerida: number | null;

  @Column({ name: 'cantidad_metros', type: 'numeric' })
  cantidadMetros: number;

  @Column({ name: 'precio_metro_aplicado', type: 'numeric' })
  precioMetroAplicado: number;

  @Column({ type: 'numeric' })
  subtotal: number;

  @Column({ name: 'regla_consumo_tela_id', type: 'bigint', nullable: true })
  reglaConsumoTelaId: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => VersionCosteo)
  @JoinColumn({ name: 'version_costeo_id' })
  versionCosteo: VersionCosteo;

  @ManyToOne(() => Tela)
  @JoinColumn({ name: 'tela_id' })
  tela: Tela;

  @ManyToOne(() => ReglaConsumoTela, { nullable: true })
  @JoinColumn({ name: 'regla_consumo_tela_id' })
  reglaConsumoTela: ReglaConsumoTela | null;
}
