import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProduccionService, OrdenProduccion } from '../../core/services/produccion.service';
@Component({ selector: 'app-produccion', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './produccion.component.html', styleUrl: './produccion.component.scss' })
export class ProduccionComponent implements OnInit {
  private readonly produccion = inject(ProduccionService); private readonly auth = inject(AuthService); ordenes: OrdenProduccion[] = []; cargando = true; mensaje = '';
  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.cargando = true; this.produccion.listarOrdenes().subscribe({ next: ordenes => { this.ordenes = ordenes; this.cargando = false; }, error: e => { this.cargando = false; this.mensaje = this.error(e); } }); }
  get docente(): boolean { return this.auth.user?.rol === 'DOCENTE'; }
  etapaActual(orden: OrdenProduccion): string { return orden.estado === 'EN_PROCESO' ? 'Proceso en curso' : orden.estado === 'PENDIENTE' ? 'Aún no inicia' : orden.estado === 'FINALIZADA' ? 'Proceso completado' : 'Proceso cancelado'; }
  accion(orden: OrdenProduccion): string { if (this.docente) return 'Ver seguimiento'; return orden.estado === 'PENDIENTE' ? 'Iniciar producción' : orden.estado === 'EN_PROCESO' ? 'Continuar producción' : orden.estado === 'FINALIZADA' ? 'Ver producción' : 'Ver'; }
  private error(e: { error?: { message?: string | string[] } }): string { const m=e.error?.message; return Array.isArray(m)?m.join(' '):m ?? 'No fue posible cargar las órdenes de producción.'; }
}
