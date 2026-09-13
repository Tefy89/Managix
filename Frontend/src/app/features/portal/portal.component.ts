import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaPublicacion, EstadoPublicacion, PortalAcademicoService, Publicacion, SeccionInterna } from '../../core/services/portal-academico.service';

@Component({ selector: 'app-portal', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './portal.component.html', styleUrls: ['./portal.component.scss'] })
export class PortalComponent implements OnInit, OnDestroy {
  private readonly portal = inject(PortalAcademicoService); private readonly auth = inject(AuthService);
  publicaciones: Publicacion[] = []; destacada?: Publicacion; galas: Publicacion[]=[]; carrera: Publicacion[]=[]; tendencias: Publicacion[]=[]; hazlo: Publicacion[]=[]; academico: Publicacion[]=[]; imagenes = new Map<string, string>();
  busqueda = ''; estado: EstadoPublicacion | '' = ''; vistaDocente: 'PUBLICADAS' | 'MIS' = 'PUBLICADAS'; mostrarFormulario = false; titulo = ''; resumenTexto = ''; categoria: CategoriaPublicacion = 'FASHION_NEWS'; seccionInterna: SeccionInterna | '' = 'CARRERA_Y_PROYECTOS'; contenido = ''; fuenteUrl = ''; videoUrl = ''; archivo?: File; cargando = false; guardando = false; mensaje = ''; error = '';
  readonly estados: EstadoPublicacion[] = ['BORRADOR', 'PUBLICADA', 'OCULTA', 'ARCHIVADA']; readonly categorias: CategoriaPublicacion[]=['FASHION_NEWS','HAZLO_TU_MISMO','CONTENIDO_ACADEMICO']; readonly secciones: SeccionInterna[]=['GALAS_Y_PASARELAS','CARRERA_Y_PROYECTOS','TENDENCIAS_Y_ACTUALIDAD'];
  get rol() { return this.auth.user?.rol; } get esDocente() { return this.rol === 'DOCENTE'; } get esAdmin() { return this.rol === 'ADMINISTRADOR'; } get puedeGestionar() { return this.esDocente || this.esAdmin; }
  ngOnInit(): void { this.cargar(); } ngOnDestroy(): void { this.imagenes.forEach(url => URL.revokeObjectURL(url)); }
  cargar(): void { this.cargando=true; this.error=''; if(this.esDocente&&this.vistaDocente==='MIS'){forkJoin(this.estados.map(estado=>this.portal.listar({estado,search:this.busqueda}))).subscribe({next:g=>this.recibir(g.flat()),error:e=>this.fallo(e)});return;} const filtros=this.esAdmin?{search:this.busqueda,...(this.estado?{estado:this.estado}:{})}:{search:this.busqueda};this.portal.listar(filtros).subscribe({next:v=>this.recibir(v),error:e=>this.fallo(e)}); }
  buscar(): void { this.cargar(); }
  abrirFormulario(): void { this.mostrarFormulario=true;this.titulo='';this.resumenTexto='';this.categoria='FASHION_NEWS';this.seccionInterna='CARRERA_Y_PROYECTOS';this.contenido='';this.fuenteUrl='';this.videoUrl='';this.archivo=undefined;this.error=''; }
  seleccionarArchivo(event: Event): void { const archivo=(event.target as HTMLInputElement).files?.[0];if(!archivo)return;if(!['image/jpeg','image/png','image/webp'].includes(archivo.type)||archivo.size>5*1024*1024){this.error='La imagen debe ser JPG, PNG o WEBP y pesar como máximo 5 MB.';return;}this.archivo=archivo;this.error=''; }
  crear(): void { if(!this.titulo.trim()||!this.contenido.trim()){this.error='Título y contenido son obligatorios.';return;}this.guardando=true; const body={titulo:this.titulo.trim(),resumen:this.resumenTexto.trim()||undefined,categoria:this.categoria,seccionInterna:this.categoria==='FASHION_NEWS'?this.seccionInterna||undefined:undefined,contenido:this.contenido.trim(),fuenteUrl:this.fuenteUrl.trim()||undefined,videoUrl:this.videoUrl.trim()||undefined};this.portal.crear(body).subscribe({next:p=>{if(!this.archivo){this.finalizar();return;}this.portal.subirImagen(p.id,this.archivo).subscribe({next:()=>this.finalizar(),error:e=>{this.guardando=false;this.error=e.error?.message??'La publicación fue creada, pero no se pudo cargar la imagen.';this.cargar();}})},error:e=>{this.guardando=false;this.error=e.error?.message??'No fue posible crear la publicación.';}}); }
  resumen(p: Publicacion, limite=160): string { const texto=(p.resumen||p.contenido).trim().replace(/\s+/g,' ');return texto.length<=limite?texto:`${texto.slice(0,texto.lastIndexOf(' ',limite)>0?texto.lastIndexOf(' ',limite):limite).trim()}…`; }
  imagen(p:Publicacion): string|undefined { return this.imagenes.get(p.id)??p.galeria?.slice().sort((a,b)=>a.orden-b.orden)[0]?.imagen; }
  etiqueta(p:Publicacion):string { return p.seccion_interna?.replaceAll('_',' ') ?? p.categoria?.replaceAll('_',' ') ?? 'PORTAL ACADÉMICO'; }
  trackById(_:number,p:Publicacion){return p.id;}
  private recibir(datos:Publicacion[]):void { this.cargando=false;this.publicaciones=[...new Map(datos.map(p=>[p.id,p])).values()].sort((a,b)=>(b.fecha_publicacion??b.created_at).localeCompare(a.fecha_publicacion??a.created_at));this.destacada=this.publicaciones.find(p=>p.titulo.startsWith('Diseño de Modas Yavirac'))??this.publicaciones[0];this.galas=this.seccion('GALAS_Y_PASARELAS');this.carrera=this.seccion('CARRERA_Y_PROYECTOS').filter(p=>p.id!==this.destacada?.id);this.tendencias=this.seccion('TENDENCIAS_Y_ACTUALIDAD');this.hazlo=this.publicaciones.filter(p=>p.categoria==='HAZLO_TU_MISMO');this.academico=this.publicaciones.filter(p=>p.categoria==='CONTENIDO_ACADEMICO');this.publicaciones.forEach(p=>this.cargarImagen(p)); }
  private seccion(s:SeccionInterna){return this.publicaciones.filter(p=>p.seccion_interna===s);}
  private cargarImagen(p:Publicacion):void {if(!p.tieneImagen||this.imagenes.has(p.id))return;this.portal.imagen(p.id).subscribe({next:b=>this.imagenes.set(p.id,URL.createObjectURL(b))});}
  private fallo(e:{error?:{message?:string}}){this.cargando=false;this.error=e.error?.message??'No fue posible cargar las publicaciones.';}
  private finalizar(){this.guardando=false;this.mostrarFormulario=false;this.mensaje='Publicación creada correctamente.';if(this.esDocente)this.vistaDocente='MIS';this.cargar();}
}