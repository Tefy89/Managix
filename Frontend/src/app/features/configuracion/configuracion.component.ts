import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdministracionService, ParametroCosteo } from '../../core/services/administracion.service';
import { AuthService } from '../../core/services/auth.service';

type GrupoParametro = 'Parámetros laborales' | 'Orden Operacional' | 'Patronaje y Corte' | 'Diseño' | 'Hilo' | 'Venta';
interface ParametroVista { codigo:string; grupo:GrupoParametro; nombre:string; unidad:string; descripcion:string; formula:string; valor:number; }

@Component({selector:'app-configuracion',standalone:true,imports:[CommonModule,FormsModule,ReactiveFormsModule],templateUrl:'./configuracion.component.html',styleUrls:['./configuracion.component.scss']})
export class ConfiguracionComponent implements OnInit,OnDestroy {
  private readonly administracion=inject(AdministracionService); readonly auth=inject(AuthService); private readonly fb=inject(FormBuilder);
  get cuenta(){return this.auth.user;} get esAdministrador(){return this.cuenta?.rol==='ADMINISTRADOR';} get puedeGestionarParametros(){return this.cuenta?.rol==='ADMINISTRADOR'||this.cuenta?.rol==='DOCENTE';}
  loading=false; photoLoading=false; parametrosLoading=false; guardandoParametro=false; message=''; error=''; fotoUrl=''; fotoError=''; parametroEditando:ParametroVista|null=null; valorParametro=0;
  readonly grupos:GrupoParametro[]=['Parámetros laborales','Orden Operacional','Patronaje y Corte','Diseño','Hilo','Venta'];
  parametros:ParametroVista[]=[];
  readonly definiciones:Array<Omit<ParametroVista,'valor'>>=[
    {codigo:'IESS_PATRONAL',grupo:'Parámetros laborales',nombre:'IESS patronal',unidad:'%',descripcion:'Aporte patronal aplicable a la mano de obra.',formula:'SBU × porcentaje IESS'},
    {codigo:'DIVISOR_DECIMO_TERCERO',grupo:'Parámetros laborales',nombre:'Divisor décimo tercero',unidad:'meses',descripcion:'Divisor usado para prorratear el décimo tercero.',formula:'SBU ÷ divisor'},
    {codigo:'DIVISOR_DECIMO_CUARTO',grupo:'Parámetros laborales',nombre:'Divisor décimo cuarto',unidad:'meses',descripcion:'Divisor usado para prorratear el décimo cuarto.',formula:'SBU ÷ divisor'},
    {codigo:'FONDOS_RESERVA',grupo:'Parámetros laborales',nombre:'Fondos de reserva',unidad:'%',descripcion:'Porcentaje referencial de fondos de reserva.',formula:'SBU × porcentaje fondos'},
    {codigo:'SEMANAS_MES',grupo:'Parámetros laborales',nombre:'Semanas por mes',unidad:'semanas',descripcion:'Semanas de trabajo consideradas por mes.',formula:'Días laborales mensuales = semanas × días'},
    {codigo:'DIAS_SEMANA',grupo:'Parámetros laborales',nombre:'Días por semana',unidad:'días',descripcion:'Jornada laboral semanal de referencia.',formula:'Minutos mensuales = semanas × días × minutos'},
    {codigo:'MINUTOS_DIA',grupo:'Parámetros laborales',nombre:'Minutos por día',unidad:'minutos',descripcion:'Duración diaria de la jornada productiva.',formula:'Capacidad base de producción'},
    {codigo:'EFICIENCIA',grupo:'Parámetros laborales',nombre:'Eficiencia',unidad:'%',descripcion:'Factor de eficiencia aplicado a los minutos productivos.',formula:'Minutos productivos = capacidad base × eficiencia'},
    {codigo:'ERROR_CRONOMETRAJE',grupo:'Orden Operacional',nombre:'Error de cronometraje',unidad:'%',descripcion:'Ajuste para variación de cronometraje.',formula:'Tiempo con error = tiempo real × (1 + error)'},
    {codigo:'CAPACIDAD_PRODUCCION',grupo:'Orden Operacional',nombre:'Capacidad de producción',unidad:'%',descripcion:'Capacidad operativa de referencia.',formula:'Tiempo con capacidad = tiempo con error ÷ capacidad'},
    {codigo:'SUPLEMENTOS',grupo:'Orden Operacional',nombre:'Suplementos',unidad:'%',descripcion:'Suplementos aplicados al tiempo estándar.',formula:'Tiempo estándar = tiempo con capacidad × (1 + suplementos)'},
    {codigo:'TARIFA_PATRONAJE',grupo:'Patronaje y Corte',nombre:'Tarifa de patronaje',unidad:'USD/h',descripcion:'Tarifa horaria aplicada a patronaje.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_DESPIECE',grupo:'Patronaje y Corte',nombre:'Tarifa de despiece',unidad:'USD/h',descripcion:'Tarifa horaria aplicada a despiece.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_CORTE',grupo:'Patronaje y Corte',nombre:'Tarifa de corte',unidad:'USD/h',descripcion:'Tarifa horaria aplicada a corte.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_CONTACTA_TEMA',grupo:'Diseño',nombre:'Contacta / selección de tema',unidad:'USD/h',descripcion:'Tarifa de actividad de diseño.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_INVESTIGACION',grupo:'Diseño',nombre:'Investigación',unidad:'USD/h',descripcion:'Tarifa de actividad de diseño.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_BOCETAJE',grupo:'Diseño',nombre:'Bocetaje',unidad:'USD/h',descripcion:'Tarifa de actividad de diseño.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_ILUSTRACION',grupo:'Diseño',nombre:'Ilustración',unidad:'USD/h',descripcion:'Tarifa de actividad de diseño.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_SELECCION',grupo:'Diseño',nombre:'Selección',unidad:'USD/h',descripcion:'Tarifa de actividad de diseño.',formula:'Costo = horas × tarifa'},
    {codigo:'TARIFA_FICHAS_TECNICAS',grupo:'Diseño',nombre:'Fichas técnicas',unidad:'USD/h',descripcion:'Tarifa de actividad de diseño.',formula:'Costo = horas × tarifa'},
    {codigo:'PRECIO_PRESENTACION_HILO',grupo:'Hilo',nombre:'Precio de presentación',unidad:'USD',descripcion:'Costo de la presentación de hilo.',formula:'Precio hilo/m = precio presentación ÷ metros'},
    {codigo:'METROS_PRESENTACION_HILO',grupo:'Hilo',nombre:'Metros por presentación',unidad:'m',descripcion:'Metraje incluido por presentación de hilo.',formula:'Precio hilo/m = precio presentación ÷ metros'},
    {codigo:'PORCENTAJE_IVA',grupo:'Venta',nombre:'IVA aplicado',unidad:'%',descripcion:'Impuesto aplicado al subtotal de venta.',formula:'PVP = costo unitario + utilidad + IVA'},
  ];
  form=this.fb.nonNullable.group({nombreInstitucion:['',[Validators.required,Validators.pattern(/.*\S.*/)] ]});
  ngOnInit(){if(this.esAdministrador)this.load(); if(this.puedeGestionarParametros)this.cargarParametros(); if(this.cuenta?.tieneFotoPerfil)this.cargarFoto();}
  ngOnDestroy(){this.limpiarUrl();}
  get iniciales(){return `${this.cuenta?.nombre?.[0]??''}${this.cuenta?.apellido?.[0]??''}`.toUpperCase();}
  parametrosDe(grupo:GrupoParametro){return this.parametros.filter(p=>p.grupo===grupo);}
  formatoParametro(p:ParametroVista){const n=new Intl.NumberFormat('es-EC',{minimumFractionDigits:p.unidad==='%'||p.unidad==='USD'||p.unidad==='USD/h'?2:0,maximumFractionDigits:2}).format(p.valor); return p.unidad==='%'?`${n} %`:p.unidad==='USD'||p.unidad==='USD/h'?`$${n}${p.unidad==='USD/h'?'/h':''}`:`${n} ${p.unidad}`;}
  cargarParametros(){this.parametrosLoading=true;this.administracion.parametrosCosteo().subscribe({next:items=>{const valores=new Map(items.map(x=>[x.codigo,Number(x.valor)]));this.parametros=this.definiciones.filter(x=>valores.has(x.codigo)).map(x=>({...x,valor:valores.get(x.codigo)!}));this.parametrosLoading=false;},error:e=>{this.error=e.error?.message??'No fue posible cargar los parámetros de costeo.';this.parametrosLoading=false;}});}
  abrirParametro(p:ParametroVista){this.parametroEditando=p;this.valorParametro=p.valor;this.error='';}
  cerrarParametro(){if(this.guardandoParametro)return;this.parametroEditando=null;}
  guardarParametro(){if(!this.parametroEditando||!Number.isFinite(this.valorParametro)||this.valorParametro<0){this.error='Ingresa un valor válido mayor o igual a cero.';return;}this.guardandoParametro=true;const codigo=this.parametroEditando.codigo;this.administracion.actualizarParametrosCosteo({[codigo]:this.valorParametro}).subscribe({next:()=>{this.message='Parámetro de costeo actualizado. Se aplicará a nuevos proyectos.';this.guardandoParametro=false;this.parametroEditando=null;this.cargarParametros();},error:e=>{this.error=e.error?.message??'No fue posible actualizar el parámetro.';this.guardandoParametro=false;}});}
  load(){this.loading=true;this.error='';this.administracion.config().subscribe({next:c=>{this.form.patchValue({nombreInstitucion:c.nombreInstitucion});this.loading=false;},error:e=>{this.error=e.error?.message??'No fue posible cargar la configuración.';this.loading=false;}})}
  save(){if(this.form.invalid){this.error='Revise los valores ingresados.';return;}this.loading=true;this.error='';this.administracion.saveConfig(this.form.getRawValue()).subscribe({next:()=>{this.message='Configuración guardada correctamente.';this.loading=false;this.load();},error:e=>{this.error=e.error?.message??'No fue posible guardar la configuración.';this.loading=false;}})}
  seleccionarFoto(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;this.fotoError='';if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){this.fotoError='Selecciona una imagen JPG, PNG o WEBP de máximo 5 MB.';return;}this.limpiarUrl();this.fotoUrl=URL.createObjectURL(file);this.photoLoading=true;this.auth.subirFotoPerfil(file).subscribe({next:()=>{this.photoLoading=false;this.message='Foto de perfil actualizada correctamente.';},error:e=>{this.photoLoading=false;this.fotoError=e.error?.message??'No fue posible cargar la foto.';this.cargarFoto();}});}
  eliminarFoto(){this.photoLoading=true;this.auth.eliminarFotoPerfil().subscribe({next:()=>{this.photoLoading=false;this.limpiarUrl();this.message='Foto de perfil eliminada.';},error:e=>{this.photoLoading=false;this.fotoError=e.error?.message??'No fue posible eliminar la foto.';}});}
  private cargarFoto(){this.auth.fotoPerfil().subscribe({next:b=>{this.limpiarUrl();this.fotoUrl=URL.createObjectURL(b);},error:()=>this.limpiarUrl()});} private limpiarUrl(){if(this.fotoUrl)URL.revokeObjectURL(this.fotoUrl);this.fotoUrl='';}
}