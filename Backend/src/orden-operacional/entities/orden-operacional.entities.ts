import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoCatalogo } from '../../auth/entities/rol.entity';

@Entity({ name: 'maquinaria' })
export class Maquinaria {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' }) id: string;
  @Column() codigo: string;
  @Column() nombre: string;
  @Column({ name: 'factor_consumo_hilo', type: 'numeric' }) factorConsumoHilo: string;
  @Column({ type: 'enum', enum: EstadoCatalogo, enumName: 'estado_catalogo' }) estado: EstadoCatalogo;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'orden_operacional' })
export class OrdenOperacional {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' }) id: string;
  @Column({ name: 'version_costeo_id', type: 'bigint' }) versionCosteoId: string;
  @Column({ name: 'total_segundos', type: 'numeric' }) totalSegundos: string;
  @Column({ name: 'total_costura_cm', type: 'numeric' }) totalCosturaCm: string;
  @Column({ name: 'total_hilo_cm', type: 'numeric' }) totalHiloCm: string;
  @Column({ name: 'total_hilo_metros', type: 'numeric' }) totalHiloMetros: string;
  @Column({ name: 'tiempo_real_minutos', type: 'numeric' }) tiempoRealMinutos: string;
  @Column({ name: 'tiempo_estandar_minutos', type: 'numeric' }) tiempoEstandarMinutos: string; @Column({ name:'porcentaje_error_cronometraje',type:'numeric',nullable:true}) porcentajeErrorCronometraje:string|null; @Column({ name:'porcentaje_capacidad',type:'numeric',nullable:true}) porcentajeCapacidad:string|null; @Column({ name:'porcentaje_suplementos',type:'numeric',nullable:true}) porcentajeSuplementos:string|null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'orden_operacional_detalle' })
export class OrdenOperacionalDetalle {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' }) id: string;
  @Column({ name: 'orden_operacional_id', type: 'bigint' }) ordenOperacionalId: string;
  @Column({ name: 'orden_visualizacion' }) ordenVisualizacion: number;
  @Column() operacion: string;
  @Column({ type: 'text', nullable: true }) descripcion: string | null;
  @Column({ name: 'maquinaria_id', type: 'bigint' }) maquinariaId: string;
  @Column({ name: 'maquinaria_nombre_aplicada' }) maquinariaNombreAplicada: string;
  @Column({ name: 'factor_hilo_aplicado', type: 'numeric' }) factorHiloAplicado: string;
  @Column({ name: 'tiempo_segundos', type: 'numeric' }) tiempoSegundos: string;
  @Column({ name: 'costura_cm', type: 'numeric' }) costuraCm: string;
  @Column({ name: 'cantidad_hilo_cm', type: 'numeric' }) cantidadHiloCm: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}