import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type EstadoCatalogo = 'ACTIVO' | 'INACTIVO';
export type CatalogoClave = 'tipos-prenda' | 'medidas' | 'telas' | 'insumos' | 'reglas-consumo-tela' | 'operaciones-sam';
export interface CatalogoBase { id: string; codigo?: string; nombre: string; descripcion?: string | null; estado: EstadoCatalogo; }
export interface TipoPrenda extends CatalogoBase { codigo: string; }
export interface Medida extends CatalogoBase { codigo: string; unidad: 'cm'; }
export interface Tela extends CatalogoBase { codigo: string; anchoCm: string | number; precioMetro: string | number; }
export interface Insumo extends CatalogoBase { codigo: string; unidadMedida: string; precioUnitario: string | number; }
export interface ReglaConsumoTela extends CatalogoBase { tipoPrendaId: string; tipoCalculo: string; parametrosCalculo: Record<string, unknown>; }
export interface OperacionSamCatalogo extends CatalogoBase { codigo: string; samReferencial: string | number; }
export interface PrendaMedida { relacion_id: string; medida_id: string; codigo: string; nombre: string; unidad: string; obligatorio: boolean; orden_visualizacion: number; estado: EstadoCatalogo; }
export interface CrearRelacion { medidaId: string; ordenVisualizacion: number; obligatorio: boolean; }
export interface EditarRelacion { ordenVisualizacion?: number; obligatorio?: boolean; }

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  constructor(private readonly api: ApiService) {}
  listar<T extends CatalogoBase>(clave: CatalogoClave, params: Record<string, string> = {}): Observable<T[]> { return this.api.get<T[]>(`/${clave}`, params); }
  obtener<T extends CatalogoBase>(clave: CatalogoClave, id: string): Observable<T> { return this.api.get<T>(`/${clave}/${id}`); }
  crear<T extends CatalogoBase>(clave: CatalogoClave, body: unknown): Observable<T> { return this.api.post<T>(`/${clave}`, body); }
  actualizar<T extends CatalogoBase>(clave: CatalogoClave, id: string, body: unknown): Observable<T> { return this.api.patch<T>(`/${clave}/${id}`, body); }
  estado<T extends CatalogoBase>(clave: CatalogoClave, id: string, estado: EstadoCatalogo): Observable<T> { return this.api.patch<T>(`/${clave}/${id}/estado`, { estado }); }
  medidasDePrenda(tipoPrendaId: string): Observable<PrendaMedida[]> { return this.api.get<PrendaMedida[]>(`/tipos-prenda/${tipoPrendaId}/medidas`); }
  asociarMedida(tipoPrendaId: string, body: CrearRelacion): Observable<PrendaMedida> { return this.api.post<PrendaMedida>(`/tipos-prenda/${tipoPrendaId}/medidas`, body); }
  actualizarRelacion(tipoPrendaId: string, relacionId: string, body: EditarRelacion): Observable<PrendaMedida> { return this.api.patch<PrendaMedida>(`/tipos-prenda/${tipoPrendaId}/medidas/${relacionId}`, body); }
  estadoRelacion(tipoPrendaId: string, relacionId: string, estado: EstadoCatalogo): Observable<PrendaMedida> { return this.api.patch<PrendaMedida>(`/tipos-prenda/${tipoPrendaId}/medidas/${relacionId}/estado`, { estado }); }
}
