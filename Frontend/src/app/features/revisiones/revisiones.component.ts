import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProduccionService, RevisionPendiente } from '../../core/services/produccion.service';
type Filtro='TODOS'|'SIN_REVISAR'|'OBSERVADA'|'APROBADA';
@Component({selector:'app-revisiones',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./revisiones.component.html',styleUrl:'./revisiones.component.scss'})
export class RevisionesComponent implements OnInit { private readonly service=inject(ProduccionService);items:RevisionPendiente[]=[];readonly filtros:Filtro[]=['TODOS','SIN_REVISAR','OBSERVADA','APROBADA'];filtro:Filtro='TODOS';busqueda='';cargando=true;mensaje='';ngOnInit():void{this.cargar();}cargar():void{this.cargando=true;const f:Record<string,string>={};if(this.filtro!=='TODOS')f['estado']=this.filtro;if(this.busqueda.trim()){f['estudiante']=this.busqueda.trim();f['proyecto']=this.busqueda.trim();}this.service.listarRevisionEtapas(f).subscribe({next:x=>{this.items=x;this.cargando=false;},error:e=>{this.cargando=false;this.mensaje=this.error(e);}});}estado(item:RevisionPendiente):string{return item.ultimoResultado??'SIN REVISAR';}private error(e:{error?:{message?:string|string[]}}):string{const m=e.error?.message;return Array.isArray(m)?m.join(' '):m??'No fue posible cargar las revisiones.';}}
