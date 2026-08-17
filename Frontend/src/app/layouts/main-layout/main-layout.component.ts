import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Notificacion, NotificacionesService } from '../../core/services/notificaciones.service';
import { UserRole } from '../../core/models/auth.models';

interface NavItem { label: string; route: string; icon: string; }
const NAVIGATION: Record<UserRole, NavItem[]> = {
  ADMINISTRADOR: [
    { label: 'Dashboard', route: '/admin', icon: 'grid' }, { label: 'Usuarios', route: '/usuarios', icon: 'users' }, { label: 'Proyectos', route: '/proyectos', icon: 'grid' }, { label: 'Catálogos', route: '/catalogos', icon: 'grid' }, { label: 'Costeo', route: '/costeo', icon: 'grid' }, { label: 'Producción', route: '/produccion', icon: 'grid' }, { label: 'Portal académico', route: '/portal', icon: 'grid' }, { label: 'Reportes', route: '/reportes', icon: 'grid' }, { label: 'Configuración', route: '/configuracion', icon: 'settings' }, { label: 'Auditoría', route: '/auditoria', icon: 'info' },
  ],
  DOCENTE: [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' }, { label: 'Revisiones', route: '/revisiones', icon: 'grid' }, { label: 'Producción', route: '/produccion', icon: 'grid' }, { label: 'Portal académico', route: '/portal', icon: 'grid' }, { label: 'Reportes', route: '/reportes', icon: 'grid' }, { label: 'Configuración', route: '/configuracion', icon: 'settings' },
  ],
  ESTUDIANTE: [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' }, { label: 'Proyectos', route: '/proyectos', icon: 'grid' }, { label: 'Costeo', route: '/costeo', icon: 'grid' }, { label: 'Producción', route: '/produccion', icon: 'grid' }, { label: 'Portal académico', route: '/portal', icon: 'grid' }, { label: 'Reportes', route: '/reportes', icon: 'grid' }, { label: 'Ficha técnica', route: '/ficha-tecnica', icon: 'info' }, { label: 'Configuración', route: '/configuracion', icon: 'settings' },
  ],
};
@Component({ selector: 'app-main-layout', standalone: true, imports: [NgFor, NgIf, RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './main-layout.component.html', styleUrls: ['./main-layout.component.scss'] })
export class MainLayoutComponent implements OnInit {
  readonly authService = inject(AuthService); private readonly router = inject(Router); private readonly notificacionesService = inject(NotificacionesService); readonly menuOpen = signal(false); readonly notificacionesOpen = signal(false); readonly notificaciones = signal<Notificacion[]>([]); readonly noLeidas = signal(0); readonly user = computed(() => this.authService.user); readonly navItems = computed(() => NAVIGATION[this.user()?.rol ?? 'ESTUDIANTE']);
  readonly initials = computed(() => { const user = this.user(); return user ? `${user.nombre[0] ?? ''}${user.apellido[0] ?? ''}`.toUpperCase() : 'MG'; });
  ngOnInit(): void { this.cargarNotificaciones(); }
  cargarNotificaciones(): void { this.notificacionesService.contador().subscribe({ next: r => this.noLeidas.set(r.count) }); this.notificacionesService.listar().subscribe({ next: r => this.notificaciones.set(r.slice(0, 5)) }); }
  alternarNotificaciones(): void { this.notificacionesOpen.set(!this.notificacionesOpen()); if (this.notificacionesOpen()) this.cargarNotificaciones(); }
  leerNotificacion(notificacion: Notificacion): void { if (notificacion.leida) return; this.notificacionesService.leer(notificacion.id).subscribe({ next: () => this.cargarNotificaciones() }); }
  leerTodas(): void { this.notificacionesService.leerTodas().subscribe({ next: () => this.cargarNotificaciones() }); }
  logout(): void { this.authService.logout(); void this.router.navigate(['/auth/login']); }
  closeMenu(): void { this.menuOpen.set(false); }
}
