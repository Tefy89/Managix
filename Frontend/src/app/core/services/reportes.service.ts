import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
export type TipoReporte='COTIZACION'|'ORDEN_PRODUCCION'|'FICHA_TECNICA'|'REPORTE_PROYECTO';
export interface ReporteGenerado{id:string;tipoReporte:TipoReporte;nombreArchivo:string;createdAt:string;proyecto:{id:string;nombre:string;estudiante?:{id:string;nombre:string;apellido:string}};generadoPor?:{id:string;nombre:string;apellido:string};versionCosteo?:{id:string;numeroVersion:number;estado:string}|null;ordenProduccion?:{id:string;codigo:string;estado:string}|null}
export type ReporteDetalle=ReporteGenerado;
@Injectable({providedIn:'root'}) export class ReportesService{constructor(private api:ApiService,private http:HttpClient){} listar(f:{tipo?:TipoReporte;proyectoId?:string}={}){const p:Record<string,string>={};if(f.tipo)p['tipo']=f.tipo;if(f.proyectoId)p['proyectoId']=f.proyectoId;return this.api.get<ReporteGenerado[]>('/reportes',p)} detalle(id:string){return this.api.get<ReporteDetalle>(`/reportes/${id}`)} archivo(id:string):Observable<Blob>{return this.http.get(`${environment.apiUrl}/reportes/${id}/archivo`,{responseType:'blob'})} cotizacion(id:string){return this.api.post<ReporteGenerado>(`/versiones-costeo/${id}/reportes/cotizacion`,{})} ficha(id:string){return this.api.post<ReporteGenerado>(`/versiones-costeo/${id}/reportes/ficha-tecnica`,{})} orden(id:string){return this.api.post<ReporteGenerado>(`/ordenes-produccion/${id}/reportes/orden-produccion`,{})} proyecto(id:string){return this.api.post<ReporteGenerado>(`/proyectos/${id}/reportes/proyecto`,{})}}
