import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Insumo, Tela } from './catalogos.service';

export type EstadoVersionCosteo = 'BORRADOR' | 'FINALIZADA' | 'CANCELADA';
export interface VersionCosteo { id: string; proyectoId: string; tipoPrendaId: string; versionPadreId: string | null; numeroVersion: number; nombre: string; descripcion: string | null; porcentajeManoObra: string | number; porcentajeGanancia: string | number; subtotalTelas: string | number; subtotalInsumos: string | number; subtotalMateriales: string | number; valorManoObra: string | number; valorGanancia: string | number; totalCosteo: string | number; pvpFinal: string | number | null; estado: EstadoVersionCosteo; createdAt?: string; updatedAt?: string; }
export type DetalleVersionCosteo = VersionCosteo;
export interface MedidaConfiguracion { tipo_prenda_medida_id: string; medida_id: string; codigo: string; nombre: string; unidad: string; obligatorio: boolean; orden_visualizacion: number; }
export interface VersionCosteoMedida extends MedidaConfiguracion { id: string; valor: string | number; }
export interface VersionCosteoTela { id: string; tela_id: string; codigo: string; nombre: string; cantidad_metros_sugerida: string | number | null; cantidad_metros: string | number; precio_metro_aplicado: string | number; subtotal: string | number; regla_consumo_tela_id: string | null; observacion: string | null; created_at: string; updated_at: string; }
export interface VersionCosteoInsumo { id: string; insumo_id: string; codigo: string; nombre: string; cantidad: string | number; unidad_medida_aplicada: string; precio_unitario_aplicado: string | number; subtotal: string | number; observacion: string | null; created_at: string; updated_at: string; }
export interface OperacionSam { id: string; codigo: string; nombre: string; descripcion: string | null; samReferencial: string | number; estado: 'ACTIVO' | 'INACTIVO'; }
export interface LineaSamVersion { id: string; operacionSamId: string; codigo: string; nombre: string; descripcion: string | null; samAplicado: string | number; cantidad: string | number; subtotalMinutos: string | number; observacion: string | null; createdAt: string; updatedAt: string; }
export interface SamVersionResponse { operaciones: LineaSamVersion[]; samTotal: string | number; }
export interface Maquinaria { id: string; codigo: string; nombre: string; factorConsumoHilo: string | number; estado: 'ACTIVO' | 'INACTIVO'; }
export interface OrdenOperacionalDetalle { id: string; ordenVisualizacion: number; operacion: string; descripcion: string | null; maquinariaId: string; maquinariaNombreAplicada: string; factorHiloAplicado: string | number; tiempoSegundos: string | number; costuraCm: string | number; cantidadHiloCm: string | number; }
export interface OrdenOperacionalResumen { id?: string; totalSegundos: string | number; totalCosturaCm: string | number; totalHiloCm: string | number; totalHiloMetros: string | number; tiempoRealMinutos: string | number; tiempoEstandarMinutos: string | number; tiempoConErrorMinutos?: string | number; tiempoConCapacidadMinutos?: string | number; suplementosMinutos?: string | number; }
export interface OrdenOperacionalResponse { orden: OrdenOperacionalResumen; detalles: OrdenOperacionalDetalle[]; }
export interface CrearDetalleOrden { operacion: string; descripcion?: string; maquinariaId: number; tiempoSegundos: number; costuraCm: number; }
export interface ActualizarDetalleOrden extends Partial<CrearDetalleOrden> {}
export interface CrearVersion { tipoPrendaId: string; nombre: string; descripcion?: string; }
export interface ActualizarVersion { nombre?: string; descripcion?: string; tipoPrendaId?: string; porcentajeManoObra?: number; porcentajeGanancia?: number; }
export interface GuardarMedidas { medidas: Array<{ tipoPrendaMedidaId: number; valor: number }>; }
export interface HiloVersion { precioPresentacion: number; metrosPresentacion: number; cantidad: number; metrosUtilizados: number; precioBase: number; precioPorMetro: number; valorUnitario: number; subtotal: number; }
export interface MaterialesVersion { telas: VersionCosteoTela[]; insumos: VersionCosteoInsumo[]; hilo: HiloVersion; resumen: { subtotalTelas: number; subtotalInsumos: number; subtotalHilo: number; subtotalMateriales: number }; }
export interface CrearTelaCatalogoCosteo { nombre: string; anchoCm: number; precioMetro: number; descripcion?: string; }
export interface CrearInsumoCatalogoCosteo { nombre: string; unidadMedida: string; precioUnitario: number; descripcion?: string; }export interface CrearTelaVersion { telaId: number; cantidadMetros: number; cantidadMetrosSugerida: null; reglaConsumoTelaId: null; precioMetroAplicado?: number; observacion?: string; }
export interface ActualizarTelaVersion { cantidadMetros?: number; precioMetroAplicado?: number; observacion?: string; }
export interface CrearInsumoVersion { insumoId: number; cantidad: number; precioUnitarioAplicado?: number; observacion?: string; }
export interface ActualizarInsumoVersion { cantidad?: number; precioUnitarioAplicado?: number; observacion?: string; }
export interface ActividadCalculoBase { codigo: string; actividad: string; horas: number; tarifaHora: number; costo: number; }
export interface CalculosBaseVersion {
  id: string; versionCosteoId: string; sbu: number | null; numeroOperarias: number;
  parametros: { semanasMes: number; diasSemana: number; minutosDia: number; eficiencia: number };
  salario: { iessPatronal: number; decimoTercero: number; decimoCuarto: number; fondosReserva: number; vacaciones: number; totalSalarioMensual: number };
  mod: { costoMensual: number; minutosProductivosMes: number; costoMinuto: number };
  moi: { sueldoPersonalAdministrativo: number; variosMoi: number; total: number; costoMinuto: number };
  gastosGenerales: { gastosGenerales: number; arriendo: number; papeleria: number; higiene: number; cafeteria: number; total: number; costoMinuto: number };
  patronajeCorte: { actividades: ActividadCalculoBase[]; totalHoras: number; totalCosto: number; costoMinuto: number };
  diseno: { actividades: ActividadCalculoBase[]; totalHoras: number; totalCosto: number; costoMinuto: number };
  hilo: HiloVersion;
  costoFinal: { tiempoEstandar: number; mod: number; moi: number; generales: number; patronajeCorte: number; diseno: number; materiales: number; costoUnitario: number; porcentajeUtilidad: number; valorUtilidad: number; subtotalVenta: number; porcentajeIva: number; valorIva: number; pvp: number };
}
export interface ActualizarCalculosBaseVersion {
  sbu?: number; numeroOperarias?: number; sueldoPersonalAdministrativo?: number; variosMoi?: number;
  gastosGenerales?: number; arriendo?: number; papeleria?: number; higiene?: number; cafeteria?: number;
  actividades?: Array<{ codigo: string; horas: number }>;
}export interface CrearLineaSamVersion { operacionSamId: number; cantidad: number; observacion?: string; }
export interface ActualizarLineaSamVersion { cantidad?: number; observacion?: string; }

@Injectable({ providedIn: 'root' })
export class CosteoService {
  constructor(private readonly api: ApiService) {}
  listarVersiones(proyectoId: string): Observable<VersionCosteo[]> { return this.api.get(`/proyectos/${proyectoId}/versiones-costeo`); }
  crearVersion(proyectoId: string, body: CrearVersion): Observable<VersionCosteo> { return this.api.post(`/proyectos/${proyectoId}/versiones-costeo`, body); }
  obtenerVersion(id: string): Observable<DetalleVersionCosteo> { return this.api.get(`/versiones-costeo/${id}`); }
  actualizarVersion(id: string, body: ActualizarVersion): Observable<DetalleVersionCosteo> { return this.api.patch(`/versiones-costeo/${id}`, body); }
  obtenerCalculosBase(id: string): Observable<CalculosBaseVersion> { return this.api.get('/versiones-costeo/' + id + '/calculos-base'); }
  actualizarCalculosBase(id: string, body: ActualizarCalculosBaseVersion): Observable<CalculosBaseVersion> { return this.api.put('/versiones-costeo/' + id + '/calculos-base', body); }
  recalcularCalculosBase(id: string): Observable<CalculosBaseVersion> { return this.api.post('/versiones-costeo/' + id + '/calculos-base/recalcular', {}); }
  configuracionMedidas(id: string): Observable<MedidaConfiguracion[]> { return this.api.get(`/versiones-costeo/${id}/medidas-configuracion`); }
  obtenerMedidas(id: string): Observable<VersionCosteoMedida[]> { return this.api.get(`/versiones-costeo/${id}/medidas`); }
  guardarMedidas(id: string, body: GuardarMedidas): Observable<VersionCosteoMedida[]> { return this.api.put(`/versiones-costeo/${id}/medidas`, body); }
  obtenerMateriales(id: string): Observable<MaterialesVersion> { return this.api.get('/versiones-costeo/' + id + '/materiales'); }
  actualizarUtilidad(id: string, porcentajeUtilidad: number): Observable<CalculosBaseVersion> { return this.api.patch('/versiones-costeo/' + id + '/costo-final/utilidad', { porcentajeUtilidad }); }
  actualizarHilo(id: string, body: Partial<Pick<HiloVersion, 'precioPresentacion' | 'metrosPresentacion'>>): Observable<MaterialesVersion> { return this.api.patch('/versiones-costeo/' + id + '/hilo', { precioPresentacionHilo: body.precioPresentacion, metrosPresentacionHilo: body.metrosPresentacion }); }
  crearTelaCatalogo(id: string, body: CrearTelaCatalogoCosteo): Observable<Tela> { return this.api.post('/versiones-costeo/' + id + '/catalogos/telas', body); }
  crearInsumoCatalogo(id: string, body: CrearInsumoCatalogoCosteo): Observable<Insumo> { return this.api.post('/versiones-costeo/' + id + '/catalogos/insumos', body); }
  obtenerTelas(id: string): Observable<VersionCosteoTela[]> { return this.api.get(`/versiones-costeo/${id}/telas`); }
  agregarTela(id: string, body: CrearTelaVersion): Observable<VersionCosteoTela> { return this.api.post(`/versiones-costeo/${id}/telas`, body); }
  actualizarTela(id: string, lineaId: string, body: ActualizarTelaVersion): Observable<VersionCosteoTela> { return this.api.patch(`/versiones-costeo/${id}/telas/${lineaId}`, body); }
  retirarTela(id: string, lineaId: string): Observable<void> { return this.api.delete(`/versiones-costeo/${id}/telas/${lineaId}`); }
  obtenerInsumos(id: string): Observable<VersionCosteoInsumo[]> { return this.api.get(`/versiones-costeo/${id}/insumos`); }
  agregarInsumo(id: string, body: CrearInsumoVersion): Observable<VersionCosteoInsumo> { return this.api.post(`/versiones-costeo/${id}/insumos`, body); }
  actualizarInsumo(id: string, lineaId: string, body: ActualizarInsumoVersion): Observable<VersionCosteoInsumo> { return this.api.patch(`/versiones-costeo/${id}/insumos/${lineaId}`, body); }
  retirarInsumo(id: string, lineaId: string): Observable<void> { return this.api.delete(`/versiones-costeo/${id}/insumos/${lineaId}`); }
    listarOperacionesSam(params: Record<string, string> = {}): Observable<OperacionSam[]> { return this.api.get('/operaciones-sam', params); }
  obtenerOperacionesSam(id: string): Observable<SamVersionResponse> { return this.api.get(`/versiones-costeo/${id}/operaciones-sam`); }
  agregarOperacionSam(id: string, body: CrearLineaSamVersion): Observable<LineaSamVersion> { return this.api.post(`/versiones-costeo/${id}/operaciones-sam`, body); }
  actualizarOperacionSam(id: string, lineaId: string, body: ActualizarLineaSamVersion): Observable<LineaSamVersion> { return this.api.patch(`/versiones-costeo/${id}/operaciones-sam/${lineaId}`, body); }
  retirarOperacionSam(id: string, lineaId: string): Observable<void> { return this.api.delete(`/versiones-costeo/${id}/operaciones-sam/${lineaId}`); }
  listarMaquinarias(params: Record<string, string> = {}): Observable<Maquinaria[]> { return this.api.get('/maquinarias', params); }
  obtenerOrdenOperacional(id: string): Observable<OrdenOperacionalResponse> { return this.api.get(`/versiones-costeo/${id}/orden-operacional`); }
  agregarDetalleOrden(id: string, body: CrearDetalleOrden): Observable<OrdenOperacionalDetalle> { return this.api.post(`/versiones-costeo/${id}/orden-operacional/detalles`, body); }
  actualizarDetalleOrden(id: string, detalleId: string, body: ActualizarDetalleOrden): Observable<OrdenOperacionalDetalle> { return this.api.patch(`/versiones-costeo/${id}/orden-operacional/detalles/${detalleId}`, body); }
  retirarDetalleOrden(id: string, detalleId: string): Observable<void> { return this.api.delete(`/versiones-costeo/${id}/orden-operacional/detalles/${detalleId}`); }
finalizar(id: string): Observable<VersionCosteo> { return this.api.post(`/versiones-costeo/${id}/finalizar`, {}); }
  cancelar(id: string): Observable<VersionCosteo> { return this.api.post(`/versiones-costeo/${id}/cancelar`, {}); }
  nuevaVersion(id: string): Observable<VersionCosteo> { return this.api.post(`/versiones-costeo/${id}/nueva-version`, {}); }
}
