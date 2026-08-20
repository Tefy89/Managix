import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type AccionAuditoria = 'CREAR' | 'ACTUALIZAR' | 'DESACTIVAR' | 'INICIAR_SESION' | 'CERRAR_SESION' | 'APROBAR' | 'OBSERVAR' | 'CANCELAR';
export interface AuditoriaRegistro { id:string; usuario:{id:string;nombre:string;correo:string|null}|null; modulo:string; accion:AccionAuditoria; entidad:string; entidadId:string|null; descripcion:string|null; metadata:unknown; createdAt:string; }
export interface AuditoriaPage { data:AuditoriaRegistro[]; total:number; page:number; limit:number; }
export interface AuditoriaFiltros { modulo?:string; accion?:AccionAuditoria|''; usuarioId?:string; entidad?:string; entidadId?:string; fechaDesde?:string; fechaHasta?:string; search?:string; page?:number; limit?:number; }
@Injectable({providedIn:'root'})
export class AuditoriaService { constructor(private readonly api:ApiService){} listar(f:AuditoriaFiltros):Observable<AuditoriaPage>{const params=Object.fromEntries(Object.entries(f).filter(([,v])=>v!==''&&v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]));return this.api.get<AuditoriaPage>('/auditoria',params)} detalle(id:string){return this.api.get<AuditoriaRegistro>(`/auditoria/${id}`)} }