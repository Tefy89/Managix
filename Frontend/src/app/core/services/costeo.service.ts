import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type EstadoVersionCosteo = 'BORRADOR' | 'FINALIZADA' | 'CANCELADA';
export interface VersionCosteo { id: string; proyectoId: string; tipoPrendaId: string; versionPadreId: string | null; numeroVersion: number; nombre: string; descripcion: string | null; porcentajeManoObra: string | number; porcentajeGanancia: string | number; subtotalTelas: string | number; subtotalInsumos: string | number; subtotalMateriales: string | number; valorManoObra: string | number; valorGanancia: string | number; totalCosteo: string | number; estado: EstadoVersionCosteo; createdAt?: string; updatedAt?: string; }
export type DetalleVersionCosteo = VersionCosteo;
export interface MedidaConfiguracion { tipo_prenda_medida_id: string; medida_id: string; codigo: string; nombre: string; unidad: string; obligatorio: boolean; orden_visualizacion: number; }
export interface VersionCosteoMedida extends MedidaConfiguracion { id: string; valor: string | number; }
export interface VersionCosteoTela { id: string; tela_id: string; codigo: string; nombre: string; cantidad_metros_sugerida: string | number | null; cantidad_metros: string | number; precio_metro_aplicado: string | number; subtotal: string | number; regla_consumo_tela_id: string | null; observacion: string | null; created_at: string; updated_at: string; }
export interface VersionCosteoInsumo { id: string; insumo_id: string; codigo: string; nombre: string; cantidad: string | number; unidad_medida_aplicada: string; precio_unitario_aplicado: string | number; subtotal: string | number; observacion: string | null; created_at: string; updated_at: string; }
export interface CrearVersion { tipoPrendaId: string; nombre: string; descripcion?: string; }
export interface ActualizarVersion { nombre?: string; descripcion?: string; porcentajeManoObra?: number; porcentajeGanancia?: number; }
export interface GuardarMedidas { medidas: Array<{ tipoPrendaMedidaId: number; valor: number }>; }
export interface CrearTelaVersion { telaId: number; cantidadMetros: number; cantidadMetrosSugerida: null; reglaConsumoTelaId: null; observacion?: string; }
export interface ActualizarTelaVersion { cantidadMetros?: number; observacion?: string; }
export interface CrearInsumoVersion { insumoId: number; cantidad: number; observacion?: string; }
export interface ActualizarInsumoVersion { cantidad?: number; observacion?: string; }

@Injectable({ providedIn: 'root' })
export class CosteoService {
  constructor(private readonly api: ApiService) {}
  listarVersiones(proyectoId: string): Observable<VersionCosteo[]> { return this.api.get(`/proyectos/${proyectoId}/versiones-costeo`); }
  crearVersion(proyectoId: string, body: CrearVersion): Observable<VersionCosteo> { return this.api.post(`/proyectos/${proyectoId}/versiones-costeo`, body); }
  obtenerVersion(id: string): Observable<DetalleVersionCosteo> { return this.api.get(`/versiones-costeo/${id}`); }
  actualizarVersion(id: string, body: ActualizarVersion): Observable<DetalleVersionCosteo> { return this.api.patch(`/versiones-costeo/${id}`, body); }
  configuracionMedidas(id: string): Observable<MedidaConfiguracion[]> { return this.api.get(`/versiones-costeo/${id}/medidas-configuracion`); }
  obtenerMedidas(id: string): Observable<VersionCosteoMedida[]> { return this.api.get(`/versiones-costeo/${id}/medidas`); }
  guardarMedidas(id: string, body: GuardarMedidas): Observable<VersionCosteoMedida[]> { return this.api.put(`/versiones-costeo/${id}/medidas`, body); }
  obtenerTelas(id: string): Observable<VersionCosteoTela[]> { return this.api.get(`/versiones-costeo/${id}/telas`); }
  agregarTela(id: string, body: CrearTelaVersion): Observable<VersionCosteoTela> { return this.api.post(`/versiones-costeo/${id}/telas`, body); }
  actualizarTela(id: string, lineaId: string, body: ActualizarTelaVersion): Observable<VersionCosteoTela> { return this.api.patch(`/versiones-costeo/${id}/telas/${lineaId}`, body); }
  retirarTela(id: string, lineaId: string): Observable<void> { return this.api.delete(`/versiones-costeo/${id}/telas/${lineaId}`); }
  obtenerInsumos(id: string): Observable<VersionCosteoInsumo[]> { return this.api.get(`/versiones-costeo/${id}/insumos`); }
  agregarInsumo(id: string, body: CrearInsumoVersion): Observable<VersionCosteoInsumo> { return this.api.post(`/versiones-costeo/${id}/insumos`, body); }
  actualizarInsumo(id: string, lineaId: string, body: ActualizarInsumoVersion): Observable<VersionCosteoInsumo> { return this.api.patch(`/versiones-costeo/${id}/insumos/${lineaId}`, body); }
  retirarInsumo(id: string, lineaId: string): Observable<void> { return this.api.delete(`/versiones-costeo/${id}/insumos/${lineaId}`); }
  finalizar(id: string): Observable<VersionCosteo> { return this.api.post(`/versiones-costeo/${id}/finalizar`, {}); }
  cancelar(id: string): Observable<VersionCosteo> { return this.api.post(`/versiones-costeo/${id}/cancelar`, {}); }
  nuevaVersion(id: string): Observable<VersionCosteo> { return this.api.post(`/versiones-costeo/${id}/nueva-version`, {}); }
}
