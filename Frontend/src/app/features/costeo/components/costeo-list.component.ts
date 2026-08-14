import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogosService, TipoPrenda } from '../../../core/services/catalogos.service';
import { CosteoService, VersionCosteo } from '../../../core/services/costeo.service';

@Component({
  selector: 'app-costeo-list', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './costeo-list.component.html', styleUrl: './costeo-list.component.scss',
})
export class CosteoListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router);
  private readonly costeo = inject(CosteoService); private readonly catalogos = inject(CatalogosService); private readonly auth = inject(AuthService);
  proyectoId = ''; versiones: VersionCosteo[] = []; tipos: TipoPrenda[] = [];
  crearVisible = false; cargando = false; mensaje = ''; nombre = ''; descripcion = ''; tipoPrendaId = '';
  get estudiante(): boolean { return this.auth.user?.rol === 'ESTUDIANTE'; }
  ngOnInit(): void { this.route.paramMap.subscribe(params => { this.proyectoId = params.get('proyectoId') ?? ''; this.cargar(); this.catalogos.listar<TipoPrenda>('tipos-prenda', { estado: 'ACTIVO' }).subscribe({ next: tipos => this.tipos = tipos, error: () => this.mensaje = 'No fue posible cargar los tipos de prenda.' }); }); }
  cargar(): void { this.costeo.listarVersiones(this.proyectoId).subscribe({ next: versiones => this.versiones = versiones, error: error => this.mensaje = this.error(error) }); }
  abrirCreacion(): void { this.nombre = ''; this.descripcion = ''; this.tipoPrendaId = ''; this.crearVisible = true; }
  crear(): void { if (!this.nombre.trim() || !this.tipoPrendaId) { this.mensaje = 'Indica un nombre y el tipo de prenda.'; return; } this.cargando = true; this.costeo.crearVersion(this.proyectoId, { nombre: this.nombre.trim(), descripcion: this.descripcion.trim() || undefined, tipoPrendaId: this.tipoPrendaId }).subscribe({ next: version => this.router.navigate(['/versiones-costeo', version.id]), error: e => { this.cargando = false; this.mensaje = this.error(e); } }); }
  cancelar(version: VersionCosteo): void { if (!confirm('¿Cancelar esta versión? No se podrá modificar después.')) return; this.costeo.cancelar(version.id).subscribe({ next: () => { this.mensaje = 'Versión cancelada.'; this.cargar(); }, error: e => this.mensaje = this.error(e) }); }
  nuevaVersion(version: VersionCosteo): void { if (!confirm('¿Crear una nueva versión a partir de esta versión finalizada?')) return; this.costeo.nuevaVersion(version.id).subscribe({ next: creada => this.router.navigate(['/versiones-costeo', creada.id]), error: e => this.mensaje = this.error(e) }); }
  tipoNombre(id: string): string { return this.tipos.find(tipo => String(tipo.id) === String(id))?.nombre ?? `Tipo de prenda #${id}`; }
  private error(error: { error?: { message?: string | string[] } }): string { const message = error.error?.message; return Array.isArray(message) ? message.join(' ') : message ?? 'No fue posible completar la operación.'; }
}
