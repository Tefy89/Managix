import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
export interface Notificacion { id: string; titulo: string; mensaje: string; tipo: string; referenciaTipo: string | null; referenciaId: string | null; leida: boolean; fechaLectura: string | null; createdAt: string; }
@Injectable({ providedIn: 'root' })
export class NotificacionesService { constructor(private readonly api: ApiService) {} listar(): Observable<Notificacion[]> { return this.api.get('/notificaciones'); } contador(): Observable<{ count: number }> { return this.api.get('/notificaciones/no-leidas/count'); } leer(id: string): Observable<Notificacion> { return this.api.patch(`/notificaciones/${id}/leer`, {}); } leerTodas(): Observable<{ updated: boolean }> { return this.api.patch('/notificaciones/leer-todas', {}); } }
