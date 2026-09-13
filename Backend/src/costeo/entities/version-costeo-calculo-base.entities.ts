import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'version_costeo_calculo_base' })
export class VersionCosteoCalculoBase {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' }) id: string;
  @Column({ name: 'version_costeo_id', type: 'bigint' }) versionCosteoId: string;
  @Column({ type: 'numeric', nullable: true }) sbu: string | null;
  @Column({ name: 'numero_operarias' }) numeroOperarias: number;
  @Column({ name: 'semanas_mes' }) semanasMes: number;
  @Column({ name: 'dias_semana' }) diasSemana: number;
  @Column({ name: 'minutos_dia' }) minutosDia: number;
  @Column({ type: 'numeric' }) eficiencia: string;
  @Column({ name: 'porcentaje_iess_patronal', type: 'numeric', nullable:true }) porcentajeIessPatronal: string|null; @Column({ name: 'divisor_decimo_tercero', type: 'numeric', nullable:true }) divisorDecimoTercero: string|null; @Column({ name: 'divisor_decimo_cuarto', type: 'numeric', nullable:true }) divisorDecimoCuarto: string|null; @Column({ name: 'porcentaje_fondos_reserva', type: 'numeric', nullable:true }) porcentajeFondosReserva: string|null; @Column({ name: 'divisor_vacaciones', type: 'numeric', nullable:true }) divisorVacaciones: string|null; @Column({ name: 'iess_patronal', type: 'numeric' }) iessPatronal: string;
  @Column({ name: 'decimo_tercero', type: 'numeric' }) decimoTercero: string;
  @Column({ name: 'decimo_cuarto', type: 'numeric' }) decimoCuarto: string;
  @Column({ name: 'fondos_reserva', type: 'numeric' }) fondosReserva: string;
  @Column({ type: 'numeric' }) vacaciones: string;
  @Column({ name: 'total_salario_mensual', type: 'numeric' }) totalSalarioMensual: string;
  @Column({ name: 'costo_mensual_mod', type: 'numeric' }) costoMensualMod: string;
  @Column({ name: 'minutos_productivos_mes', type: 'numeric' }) minutosProductivosMes: string;
  @Column({ name: 'costo_minuto_mod', type: 'numeric' }) costoMinutoMod: string;
  @Column({ name: 'sueldo_personal_administrativo', type: 'numeric' }) sueldoPersonalAdministrativo: string;
  @Column({ name: 'varios_moi', type: 'numeric' }) variosMoi: string;
  @Column({ name: 'total_moi', type: 'numeric' }) totalMoi: string;
  @Column({ name: 'costo_minuto_moi', type: 'numeric' }) costoMinutoMoi: string;
  @Column({ name: 'gastos_generales', type: 'numeric' }) gastosGenerales: string;
  @Column({ type: 'numeric' }) arriendo: string;
  @Column({ type: 'numeric' }) papeleria: string;
  @Column({ type: 'numeric' }) higiene: string;
  @Column({ type: 'numeric' }) cafeteria: string;
  @Column({ name: 'total_gastos_generales', type: 'numeric' }) totalGastosGenerales: string;
  @Column({ name: 'costo_minuto_gastos_generales', type: 'numeric' }) costoMinutoGastosGenerales: string;
  @Column({ name: 'total_horas_patronaje_corte', type: 'numeric' }) totalHorasPatronajeCorte: string;
  @Column({ name: 'total_costo_patronaje_corte', type: 'numeric' }) totalCostoPatronajeCorte: string;
  @Column({ name: 'costo_minuto_patronaje_corte', type: 'numeric' }) costoMinutoPatronajeCorte: string;
  @Column({ name: 'total_horas_diseno', type: 'numeric' }) totalHorasDiseno: string;
  @Column({ name: 'total_costo_diseno', type: 'numeric' }) totalCostoDiseno: string;
  @Column({ name: 'costo_minuto_diseno', type: 'numeric' }) costoMinutoDiseno: string;
  @Column({ name: 'precio_presentacion_hilo', type: 'numeric' }) precioPresentacionHilo: string;
  @Column({ name: 'metros_presentacion_hilo', type: 'numeric' }) metrosPresentacionHilo: string;
  @Column({ name: 'hilo_total_metros', type: 'numeric' }) hiloTotalMetros: string;
  @Column({ name: 'precio_hilo_por_metro', type: 'numeric' }) precioHiloPorMetro: string;
  @Column({ name: 'subtotal_hilo', type: 'numeric' }) subtotalHilo: string;
  @Column({ name: 'tiempo_estandar_aplicado', type: 'numeric' }) tiempoEstandarAplicado: string;
  @Column({ name: 'costo_mod_prenda', type: 'numeric' }) costoModPrenda: string;
  @Column({ name: 'costo_moi_prenda', type: 'numeric' }) costoMoiPrenda: string;
  @Column({ name: 'costo_generales_prenda', type: 'numeric' }) costoGeneralesPrenda: string;
  @Column({ name: 'costo_patronaje_corte_prenda', type: 'numeric' }) costoPatronajeCortePrenda: string;
  @Column({ name: 'costo_diseno_prenda', type: 'numeric' }) costoDisenoPrenda: string;
  @Column({ name: 'costo_materiales', type: 'numeric' }) costoMateriales: string;
  @Column({ name: 'costo_unitario', type: 'numeric' }) costoUnitario: string;
  @Column({ name: 'porcentaje_utilidad', type: 'numeric' }) porcentajeUtilidad: string;
  @Column({ name: 'valor_utilidad', type: 'numeric' }) valorUtilidad: string;
  @Column({ name: 'subtotal_venta', type: 'numeric' }) subtotalVenta: string;
  @Column({ name: 'porcentaje_iva_aplicado', type: 'numeric' }) porcentajeIvaAplicado: string;
  @Column({ name: 'valor_iva', type: 'numeric' }) valorIva: string;
  @Column({ type: 'numeric' }) pvp: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'version_costeo_calculo_actividad' })
export class VersionCosteoCalculoActividad {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' }) id: string;
  @Column({ name: 'version_costeo_calculo_base_id', type: 'bigint' }) versionCosteoCalculoBaseId: string;
  @Column() grupo: 'PATRONAJE_CORTE' | 'DISENO';
  @Column() codigo: string;
  @Column() actividad: string;
  @Column({ name: 'orden_visualizacion' }) ordenVisualizacion: number;
  @Column({ type: 'numeric' }) horas: string;
  @Column({ name: 'tarifa_hora_aplicada', type: 'numeric' }) tarifaHoraAplicada: string;
  @Column({ type: 'numeric' }) costo: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
