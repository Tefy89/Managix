import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccionAuditoria, AuditoriaFiltros, AuditoriaRegistro, AuditoriaService } from '../../core/services/auditoria.service';

@Component({selector:'app-auditoria',standalone:true,imports:[CommonModule,FormsModule,DatePipe],templateUrl:'./auditoria.component.html',styleUrls:['./auditoria.component.scss']})
export class AuditoriaComponent implements OnInit {
  readonly acciones:AccionAuditoria[]=['CREAR','ACTUALIZAR','DESACTIVAR','INICIAR_SESION','CERRAR_SESION','APROBAR','OBSERVAR','CANCELAR'];
  filtros:AuditoriaFiltros={page:1,limit:20}; registros:AuditoriaRegistro[]=[]; total=0; cargando=false; error=''; detalle?:AuditoriaRegistro;
  constructor(private readonly auditoria:AuditoriaService){}
  ngOnInit(){this.cargar();}
  cargar(page=this.filtros.page??1){this.cargando=true;this.error='';this.filtros.page=page;this.auditoria.listar(this.filtros).subscribe({next:r=>{this.registros=r.data;this.total=r.total;this.filtros.page=r.page;this.filtros.limit=r.limit;this.cargando=false;},error:e=>{this.error=e.error?.message??'No fue posible cargar el historial.';this.cargando=false;}});}
  limpiar(){this.filtros={page:1,limit:20};this.cargar();}
  ver(registro:AuditoriaRegistro){this.auditoria.detalle(registro.id).subscribe({next:r=>this.detalle=r,error:e=>this.error=e.error?.message??'No fue posible cargar el detalle.'});}
  get pagina(){return this.filtros.page??1;} get paginas(){return Math.max(1,Math.ceil(this.total/(this.filtros.limit??20)));} get puedeAnterior(){return this.pagina>1;} get puedeSiguiente(){return this.pagina<this.paginas;}
}