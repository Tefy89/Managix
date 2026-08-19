import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProyectosService, Proyecto } from '../../core/services/proyectos.service';
import { CosteoService, VersionCosteo } from '../../core/services/costeo.service';
import { ProduccionService, OrdenProduccion, RevisionPendiente } from '../../core/services/produccion.service';
import { Notificacion, NotificacionesService } from '../../core/services/notificaciones.service';
import { PortalAcademicoService, Publicacion } from '../../core/services/portal-academico.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { AdministracionService } from '../../core/services/administracion.service';

interface VersionReciente extends VersionCosteo { proyectoNombre: string; }

@Component({
  selector: 'app-dashboard', standalone: true, imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService); private readonly proyectosService = inject(ProyectosService);
  private readonly costeo = inject(CosteoService); private readonly produccion = inject(ProduccionService);
  private readonly notificacionesService = inject(NotificacionesService); private readonly portal = inject(PortalAcademicoService);
  private readonly catalogos = inject(CatalogosService); private readonly administracion = inject(AdministracionService);

  readonly user = this.auth.user; proyectos: Proyecto[] = []; versiones: VersionReciente[] = []; ordenes: OrdenProduccion[] = [];
  notificaciones: Notificacion[] = []; publicaciones: Publicacion[] = []; revisiones: RevisionPendiente[] = [];
  noLeidas = 0; totalUsuarios = 0; operacionesSamActivas = 0; cargando = true; avisos: string[] = [];

  get rol(): string { return this.user?.rol ?? ''; }
  get estudiante(): boolean { return this.rol === 'ESTUDIANTE'; }
  get docente(): boolean { return this.rol === 'DOCENTE'; }
  get admin(): boolean { return this.rol === 'ADMINISTRADOR'; }
  get proyectosActivos(): number { return this.proyectos.filter(proyecto => proyecto.estado === 'ACTIVO').length; }
  get ordenesEnProceso(): number { return this.ordenes.filter(orden => orden.estado === 'EN_PROCESO').length; }
  get versionesFinalizadas(): number { return this.versiones.filter(version => version.estado === 'FINALIZADA').length; }
  get recientes(): Proyecto[] { return this.proyectos.slice(0, 4); }
  get ordenesRecientes(): OrdenProduccion[] { return this.ordenes.slice(0, 4); }
  get publicacionesRecientes(): Publicacion[] { return this.publicaciones.slice(0, 3); }
  get notificacionesRecientes(): Notificacion[] { return this.notificaciones.slice(0, 4); }

  ngOnInit(): void { this.cargarBase(); }

  private cargarBase(): void {
    this.cargando = true;
    this.notificacionesService.contador().subscribe({ next: value => this.noLeidas = value.count, error: () => this.fallo('No fue posible cargar las notificaciones.') });
    this.notificacionesService.listar().subscribe({ next: value => this.notificaciones = value, error: () => this.fallo('No fue posible cargar las notificaciones recientes.') });
    this.portal.listar({ estado: 'PUBLICADA' }).subscribe({ next: value => this.publicaciones = value, error: () => this.fallo('No fue posible cargar las publicaciones recientes.') });
    this.proyectosService.list().subscribe({ next: value => { this.proyectos = value; this.cargarVersiones(value); this.cargando = false; }, error: () => { this.fallo('No fue posible cargar los proyectos.'); this.cargando = false; } });
    this.produccion.listarOrdenes().subscribe({ next: value => this.ordenes = value, error: () => this.fallo('No fue posible cargar las órdenes de producción.') });
    if (this.docente) this.produccion.listarRevisionEtapas().subscribe({ next: value => this.revisiones = value, error: () => this.fallo('No fue posible cargar las revisiones pendientes.') });
    if (this.admin) this.cargarAdmin();
  }

  private cargarVersiones(proyectos: Proyecto[]): void {
    for (const proyecto of proyectos.slice(0, 6)) {
      this.costeo.listarVersiones(proyecto.id).subscribe({ next: versions => this.versiones = [...this.versiones, ...versions.map(version => ({ ...version, proyectoNombre: proyecto.nombre }))].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6), error: () => this.fallo(`No fue posible cargar el costeo de ${proyecto.nombre}.`) });
    }
  }

  private cargarAdmin(): void {
    this.administracion.users({ page: '1', limit: '1' }).subscribe({ next: value => this.totalUsuarios = value.total, error: () => this.fallo('No fue posible cargar el total de usuarios.') });
    this.catalogos.listar('operaciones-sam', { estado: 'ACTIVO' }).subscribe({ next: value => this.operacionesSamActivas = value.length, error: () => this.fallo('No fue posible cargar las operaciones SAM.') });
  }

  private fallo(mensaje: string): void { if (!this.avisos.includes(mensaje)) this.avisos.push(mensaje); }
}