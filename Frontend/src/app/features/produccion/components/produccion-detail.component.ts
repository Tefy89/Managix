import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EvidenciaEtapa, OrdenProduccion, OrdenProduccionEtapa, ProduccionService, RevisionEtapa } from '../../../core/services/produccion.service';
interface EvidenciaVista extends EvidenciaEtapa { preview?: string; }
@Component({ selector:'app-produccion-detail', standalone:true, imports:[CommonModule,FormsModule,RouterLink], templateUrl:'./produccion-detail.component.html', styleUrl:'./produccion-detail.component.scss' })
export class ProduccionDetailComponent implements OnInit, OnDestroy {
 private readonly route=inject(ActivatedRoute); private readonly router=inject(Router); private readonly auth=inject(AuthService); private readonly service=inject(ProduccionService); private readonly http=inject(HttpClient);
 id=''; orden?:OrdenProduccion; etapas:OrdenProduccionEtapa[]=[]; etapa?:OrdenProduccionEtapa; evidencias:EvidenciaVista[]=[]; revisiones:RevisionEtapa[]=[]; observacion=''; descripcion=''; archivo?:File; preview?:string; mensaje=''; cargando=true; guardando=false; checks=[false,false,false]; modal:''|'iniciar'|'completar'='';
 ngOnInit():void { this.route.paramMap.subscribe(p=>{this.id=p.get('id')??'';this.cargar();}); }
 ngOnDestroy():void { this.limpiarPreview(); }
 get estudiante():boolean{return this.auth.user?.rol==='ESTUDIANTE';} get docente():boolean{return this.auth.user?.rol==='DOCENTE';} get enProceso():boolean{return this.estudiante && this.etapa?.estado==='EN_PROCESO' && this.orden?.estado==='EN_PROCESO';} get completada():number{return this.etapas.filter(e=>e.estado==='COMPLETADA').length;} get progreso():number{return this.etapas.length?Math.round(this.completada*100/this.etapas.length):0;} get checklistListo():boolean{return this.checks.every(Boolean)&&this.evidencias.length>0;} get ultimaRevision():RevisionEtapa|undefined{return this.revisiones[this.revisiones.length-1];}
 cargar():void {if(!this.id)return;this.cargando=true;this.service.obtenerOrden(this.id).subscribe({next:o=>{this.orden=o;this.service.etapas(this.id).subscribe({next:e=>{this.etapas=e;this.seleccionar(e.find(x=>x.estado==='EN_PROCESO')??e[0]);this.cargando=false;},error:x=>this.fallo(x)});},error:x=>this.fallo(x)});}
 seleccionar(etapa:OrdenProduccionEtapa):void {this.etapa=etapa;this.observacion=etapa.observacion_estudiante??'';this.checks=[false,false,false];this.limpiarPreview();this.evidencias=[];this.revisiones=[];forkJoin({evidencias:this.service.evidencias(this.id,etapa.id),revisiones:this.service.revisiones(this.id,etapa.id)}).subscribe({next:d=>{this.revisiones=d.revisiones;this.evidencias=d.evidencias.map(e=>({...e}));this.evidencias.forEach(e=>this.cargarPreview(e));},error:x=>this.mensaje=this.error(x)});}
 iniciar():void {this.guardar(this.service.iniciarOrden(this.id),'Producción iniciada.');}
 guardarObservacion():void {if(!this.etapa||!this.enProceso)return;this.guardar(this.service.actualizarObservacion(this.id,this.etapa.id,this.observacion),'Observación guardada.');}
 archivoSeleccionado(event:Event):void {const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){this.mensaje='Selecciona una imagen JPG, PNG o WEBP de máximo 5 MB.';return;}this.archivo=file;this.limpiarPreview();this.preview=URL.createObjectURL(file);}
 subir():void {if(!this.etapa||!this.archivo||!this.enProceso)return;this.guardar(this.service.subirEvidencia(this.id,this.etapa.id,this.archivo,this.descripcion),'Evidencia agregada.',()=>{this.archivo=undefined;this.descripcion='';this.limpiarPreview();this.seleccionar(this.etapa!);});}
 eliminar(e:EvidenciaVista):void {if(!this.etapa||!this.enProceso||!confirm('¿Eliminar esta evidencia?'))return;this.guardar(this.service.eliminarEvidencia(this.id,this.etapa.id,e.id),'Evidencia eliminada.',()=>this.seleccionar(this.etapa!));}
 completar():void {if(!this.etapa||!this.checklistListo)return;this.guardar(this.service.completarEtapa(this.id,this.etapa.id),'Etapa completada.',()=>{this.modal='';this.cargar();});}
 volver():void {void this.router.navigate(['/produccion']);}
 private cargarPreview(e:EvidenciaVista):void {this.http.get(`${environment.apiUrl}/evidencias/${e.id}/archivo`,{responseType:'blob'}).subscribe({next:b=>e.preview=URL.createObjectURL(b)});}
 private guardar(operacion:{subscribe:(arg:{next:()=>void;error:(x:unknown)=>void})=>unknown},ok:string,after?:()=>void):void{this.guardando=true;operacion.subscribe({next:()=>{this.guardando=false;this.mensaje=ok;after?.();if(!after)this.cargar();},error:x=>this.fallo(x)});}
 private fallo(x:unknown):void{this.cargando=false;this.guardando=false;this.modal='';this.mensaje=this.error(x);}
 private error(x:unknown):string{const e=x as {error?:{message?:string|string[]}};const m=e.error?.message;return Array.isArray(m)?m.join(' '):m??'No fue posible completar la operación.';}
 private limpiarPreview():void{if(this.preview)URL.revokeObjectURL(this.preview);this.preview=undefined;}
}
