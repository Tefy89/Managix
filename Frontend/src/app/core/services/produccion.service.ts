import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type EstadoOrdenProduccion = 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA' | 'CANCELADA';
export type EstadoEtapaProduccion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'EN_REVISION' | 'OBSERVADA' | 'APROBADA';
export interface OrdenProduccion { id: string; codigo: string; estado: EstadoOrdenProduccion; fechaInicio: string | null; fechaFin: string | null; proyectoNombre: string; tipoPrendaNombre: string; versionNombre: string; numeroVersion: number; versionId: string; proyectoId: string; estudianteId: string; estudianteNombre: string; estudianteApellido: string; }
export interface OrdenProduccionEtapa { id: string; etapa_produccion_id: string; codigo: string; nombre: string; orden: number; estado: EstadoEtapaProduccion; fecha_inicio: string | null; fecha_fin: string | null; observacion_estudiante: string | null; }
export interface EvidenciaEtapa { id: string; nombre_original_archivo: string; mime_type: string; tamano_bytes: string; descripcion: string | null; created_at: string; usuario?: { id: string; nombre: string; apellido: string }; }
export interface RevisionPendiente { etapaId:string; codigo:string; nombre:string; orden:number; estadoProductivo:string; fechaCompletado:string|null; ordenId:string; ordenCodigo:string; proyectoId:string; proyectoNombre:string; estudianteId:string; estudianteNombre:string; estudianteApellido:string; tipoPrendaNombre:string; cantidadEvidencias:number; ultimaRevisionId:string|null; ultimoResultado:'OBSERVADA'|'APROBADA'|null; ultimaObservacion:string|null; ultimaRevisionFecha:string|null; }
export interface RevisionEtapa { id: string; resultado_revision: 'OBSERVADA' | 'APROBADA'; observacion: string | null; created_at: string; docente?: { id: string; nombre: string; apellido: string }; }
@Injectable({ providedIn: 'root' })
export class ProduccionService {
  constructor(private readonly api: ApiService) {}
  listarOrdenes(): Observable<OrdenProduccion[]> { return this.api.get('/ordenes-produccion'); }
  obtenerOrden(id: string): Observable<OrdenProduccion> { return this.api.get(`/ordenes-produccion/${id}`); }
  ordenPorVersion(versionId: string): Observable<OrdenProduccion> { return this.api.get(`/versiones-costeo/${versionId}/orden-produccion`); }
  crearOrden(versionId: string, observacion?: string): Observable<OrdenProduccion> { return this.api.post(`/versiones-costeo/${versionId}/orden-produccion`, observacion ? { observacion } : {}); }
  iniciarOrden(id: string): Observable<OrdenProduccion> { return this.api.post(`/ordenes-produccion/${id}/iniciar`, {}); }
  etapas(ordenId: string): Observable<OrdenProduccionEtapa[]> { return this.api.get(`/ordenes-produccion/${ordenId}/etapas`); }
  actualizarObservacion(ordenId: string, etapaId: string, observacionEstudiante: string): Observable<OrdenProduccionEtapa> { return this.api.patch(`/ordenes-produccion/${ordenId}/etapas/${etapaId}`, { observacionEstudiante }); }
  evidencias(ordenId: string, etapaId: string): Observable<EvidenciaEtapa[]> { return this.api.get(`/ordenes-produccion/${ordenId}/etapas/${etapaId}/evidencias`); }
  subirEvidencia(ordenId: string, etapaId: string, file: File, descripcion?: string): Observable<EvidenciaEtapa> { const body = new FormData(); body.append('file', file); if (descripcion?.trim()) body.append('descripcion', descripcion.trim()); return this.api.post(`/ordenes-produccion/${ordenId}/etapas/${etapaId}/evidencias`, body); }
  eliminarEvidencia(ordenId: string, etapaId: string, evidenciaId: string): Observable<void> { return this.api.delete(`/ordenes-produccion/${ordenId}/etapas/${etapaId}/evidencias/${evidenciaId}`); }
  completarEtapa(ordenId: string, etapaId: string): Observable<OrdenProduccionEtapa> { return this.api.post(`/ordenes-produccion/${ordenId}/etapas/${etapaId}/completar`, {}); }
  revisiones(ordenId: string, etapaId: string): Observable<RevisionEtapa[]> { return this.api.get(`/ordenes-produccion/${ordenId}/etapas/${etapaId}/revisiones`); }
  listarRevisionEtapas(filters?: Record<string, string>): Observable<RevisionPendiente[]> { return this.api.get('/revisiones/etapas', filters); }
  crearRevision(ordenId: string, etapaId: string, body: { resultado: 'OBSERVADA' | 'APROBADA'; observacion?: string }): Observable<RevisionEtapa> { return this.api.post(`/ordenes-produccion/${ordenId}/etapas/${etapaId}/revisiones`, body); }  archivoUrl(id: string): string { return `http://localhost:3000/evidencias/${id}/archivo`; }
}
