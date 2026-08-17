import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { ProyectosService, Proyecto } from '../../core/services/proyectos.service';
import { CosteoService, VersionCosteo } from '../../core/services/costeo.service';
import { AuthService } from '../../core/services/auth.service';

interface ProyectoCosteo { proyecto: Proyecto; versiones: VersionCosteo[]; }
@Component({ selector: 'app-costeo', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './costeo.component.html', styleUrls: ['./costeo.component.scss'] })
export class CosteoComponent implements OnInit {
  private readonly proyectosService = inject(ProyectosService); private readonly costeoService = inject(CosteoService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly auth = inject(AuthService);
  proyectos: ProyectoCosteo[] = []; cargando = true; mensaje = ''; proyectoSeleccionado = '';
  get estudiante(): boolean { return this.auth.user?.rol === 'ESTUDIANTE'; }
  ngOnInit(): void { this.route.queryParamMap.subscribe(params => { this.proyectoSeleccionado = params.get('proyectoId') ?? ''; this.cargar(); }); }
  cargar(): void { this.cargando = true; this.proyectosService.list().pipe(switchMap(proyectos => forkJoin(proyectos.map(proyecto => this.costeoService.listarVersiones(proyecto.id).pipe(catchError(() => of([] as VersionCosteo[]))).pipe(switchMap(versiones => of({ proyecto, versiones }))))))).subscribe({ next: proyectos => { this.proyectos = proyectos; this.cargando = false; }, error: () => { this.mensaje = 'No fue posible cargar los proyectos para costeo.'; this.cargando = false; } }); }
  ultima(item: ProyectoCosteo): VersionCosteo | undefined { return [...item.versiones].sort((a, b) => b.numeroVersion - a.numeroVersion)[0]; }
  abrir(item: ProyectoCosteo): void { void this.router.navigate(['/proyectos', item.proyecto.id, 'versiones-costeo']); }
  etiquetaAccion(item: ProyectoCosteo): string { const ultima = this.ultima(item); if (!ultima) return 'Crear costeo'; return ultima.estado === 'BORRADOR' ? 'Continuar costeo' : ultima.estado === 'FINALIZADA' ? 'Ver costeo' : 'Ver versiones'; }
}
