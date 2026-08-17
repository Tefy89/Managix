import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export type EstadoPublicacion = 'BORRADOR' | 'PUBLICADA' | 'OCULTA' | 'ARCHIVADA';

export interface AutorPublicacion { id: string; nombre: string; apellido: string; }
export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  tieneImagen: boolean;
  estado: EstadoPublicacion;
  autor?: AutorPublicacion;
  fecha_publicacion: string | null;
  created_at: string;
  updated_at: string;
}
export interface CrearPublicacion { titulo: string; contenido: string; }
export interface ActualizarPublicacion { titulo?: string; contenido?: string; }
export interface FiltrosPublicaciones { estado?: EstadoPublicacion; search?: string; }

@Injectable({ providedIn: 'root' })
export class PortalAcademicoService {
  constructor(private readonly api: ApiService, private readonly http: HttpClient) {}

  listar(filtros: FiltrosPublicaciones = {}): Observable<Publicacion[]> {
    const params: Record<string, string> = {};
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.search?.trim()) params['search'] = filtros.search.trim();
    return this.api.get<Publicacion[]>('/publicaciones', params);
  }
  obtener(id: string): Observable<Publicacion> { return this.api.get<Publicacion>(`/publicaciones/${id}`); }
  crear(body: CrearPublicacion): Observable<Publicacion> { return this.api.post<Publicacion>('/publicaciones', body); }
  actualizar(id: string, body: ActualizarPublicacion): Observable<Publicacion> { return this.api.patch<Publicacion>(`/publicaciones/${id}`, body); }
  publicar(id: string): Observable<Publicacion> { return this.api.post<Publicacion>(`/publicaciones/${id}/publicar`, {}); }
  ocultar(id: string): Observable<Publicacion> { return this.api.post<Publicacion>(`/publicaciones/${id}/ocultar`, {}); }
  archivar(id: string): Observable<Publicacion> { return this.api.post<Publicacion>(`/publicaciones/${id}/archivar`, {}); }
  subirImagen(id: string, archivo: File): Observable<Publicacion> {
    const form = new FormData(); form.append('file', archivo);
    return this.http.post<Publicacion>(`${environment.apiUrl}/publicaciones/${id}/imagen`, form);
  }
  eliminarImagen(id: string): Observable<void> { return this.api.delete<void>(`/publicaciones/${id}/imagen`); }
  imagen(id: string): Observable<Blob> { return this.http.get(`${environment.apiUrl}/publicaciones/${id}/imagen`, { responseType: 'blob' }); }
}
