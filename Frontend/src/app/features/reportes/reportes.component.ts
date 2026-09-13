import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CosteoService, VersionCosteo } from '../../core/services/costeo.service';
import { Proyecto, ProyectosService } from '../../core/services/proyectos.service';
import { ReporteGenerado, ReportesService, TipoFicha } from '../../core/services/reportes.service';

@Component({selector:'app-reportes',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./reportes.component.html',styleUrls:['./reportes.component.scss']})
export class ReportesComponent implements OnInit {
  tipos:{id:TipoFicha;titulo:string;descripcion:string}[]=[
    {id:'DISENO',titulo:'Ficha de Diseño',descripcion:'Concepto, paleta e información creativa de la prenda.'},
    {id:'TECNICA',titulo:'Ficha Técnica',descripcion:'Medidas, materiales, diseño y seguimiento de producción.'},
    {id:'ORDEN_OPERACIONAL',titulo:'Ficha de Orden Operacional',descripcion:'Operaciones, maquinaria, consumo de hilo y Tiempo Estándar.'},
    {id:'COSTOS',titulo:'Ficha de Costos',descripcion:'Detalle de costos, materiales, utilidad, IVA y PVP.'}
  ];
  proyectos:Proyecto[]=[];versiones:VersionCosteo[]=[];historial:ReporteGenerado[]=[];tipo:TipoFicha='DISENO';proyectoId='';versionId='';cargando=false;mensaje='';error='';rol='';
  constructor(private reportes:ReportesService,private proyectosService:ProyectosService,private costeo:CosteoService,private auth:AuthService){}
  ngOnInit(){this.rol=this.auth.user?.rol??'';this.proyectosService.list().subscribe({next:p=>this.proyectos=p,error:()=>this.error='No fue posible cargar los proyectos.'});this.cargarHistorial()}
  seleccionar(tipo:TipoFicha){this.tipo=tipo;this.mensaje='';this.error=''}
  cambioProyecto(){this.versionId='';this.versiones=[];if(this.proyectoId)this.costeo.listarVersiones(this.proyectoId).subscribe({next:v=>this.versiones=v,error:()=>this.error='No fue posible cargar las versiones.'})}
  generar(){this.error='';this.mensaje='';if(!this.versionId){this.error='Seleccione una versión de costeo.';return}const call=this.tipo==='DISENO'?this.reportes.fichaDiseno(this.versionId):this.tipo==='TECNICA'?this.reportes.fichaTecnica(this.versionId):this.tipo==='ORDEN_OPERACIONAL'?this.reportes.fichaOrdenOperacional(this.versionId):this.reportes.fichaCostos(this.versionId);this.cargando=true;call.subscribe({next:r=>{this.cargando=false;this.mensaje='Ficha generada correctamente.';this.cargarHistorial();this.verPdf(r)},error:e=>{this.cargando=false;this.error=e.error?.message??'No fue posible generar la ficha.'}})}
  cargarHistorial(){this.reportes.listar(this.proyectoId?{proyectoId:this.proyectoId}:{}).subscribe({next:r=>this.historial=r,error:()=>this.error='No fue posible cargar el historial.'})}
  verPdf(r:ReporteGenerado){this.reportes.archivo(r.id).subscribe({next:b=>{const u=URL.createObjectURL(b);window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),60000)},error:()=>this.error='No fue posible abrir el PDF.'})}
  nombreTipo(t:string){return ({REPORTE_PROYECTO:'Ficha de Diseño',FICHA_TECNICA:'Ficha Técnica',ORDEN_PRODUCCION:'Ficha de Orden Operacional',COTIZACION:'Ficha de Costos'} as Record<string,string>)[t]??t}
}