import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export type TipoImagenFicha = 'delantera' | 'espalda' | 'detalle' | 'tejido';
export interface PaletaColor { nombre: string; hex: string; }
export interface FichaDiseno { nombreColeccion: string | null; referencia: string | null; temporada: string | null; marca: string | null; linea: string | null; categoria: string | null; target: string | null; estilo: string | null; silueta: string | null; tallas: string | null; uso: string | null; fundamentacion: string | null; detallesConstructivos: string | null; acabados: string | null; tejidoReferencial: string | null; paletaColores: PaletaColor[] | null; imagenes: Record<TipoImagenFicha, boolean>; createdAt: string; updatedAt: string; }
export interface FichaDisenoResponse { existe: boolean; ficha: FichaDiseno | null; }
export type GuardarFichaDiseno = Partial<Omit<FichaDiseno, 'imagenes' | 'createdAt' | 'updatedAt'>>;
@Injectable({ providedIn: 'root' }) export class FichaDisenoService {
 private readonly base = environment.apiUrl; constructor(private readonly http: HttpClient) {}
 obtener(proyectoId: string): Observable<FichaDisenoResponse> { return this.http.get<FichaDisenoResponse>(this.base+'/proyectos/'+proyectoId+'/ficha-diseno'); }
 guardar(proyectoId: string, ficha: GuardarFichaDiseno): Observable<FichaDiseno> { return this.http.put<FichaDiseno>(this.base+'/proyectos/'+proyectoId+'/ficha-diseno', ficha); }
 subirImagen(proyectoId: string, tipo: TipoImagenFicha, archivo: File): Observable<FichaDiseno> { const body = new FormData(); body.append('file', archivo); return this.http.post<FichaDiseno>(this.base+'/proyectos/'+proyectoId+'/ficha-diseno/imagenes/'+tipo, body); }
 obtenerImagen(proyectoId: string, tipo: TipoImagenFicha): Observable<Blob> { return this.http.get(this.base+'/proyectos/'+proyectoId+'/ficha-diseno/imagenes/'+tipo, { responseType: 'blob' }); }
 eliminarImagen(proyectoId: string, tipo: TipoImagenFicha): Observable<FichaDiseno> { return this.http.delete<FichaDiseno>(this.base+'/proyectos/'+proyectoId+'/ficha-diseno/imagenes/'+tipo); }
}