import { Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/auth.models';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

const NAVIGATION: Record<UserRole, NavItem[]> = {
  ADMINISTRADOR: [
    { label: 'Dashboard', route: '/admin', icon: 'grid' }, { label: 'Usuarios', route: '/usuarios', icon: 'users' },
    { label: 'Proyectos', route: '/proyectos', icon: 'grid' }, { label: 'Catálogos', route: '/catalogos', icon: 'grid' },
    { label: 'Costos', route: '/costeo', icon: 'grid' }, { label: 'Producción', route: '/produccion', icon: 'grid' },
    { label: 'Portal académico', route: '/portal', icon: 'grid' }, { label: 'Reportes', route: '/reportes', icon: 'grid' },
    { label: 'Configuración', route: '/configuracion', icon: 'settings' },
  ],
  DOCENTE: [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' }, { label: 'Proyectos y revisiones', route: '/proyectos', icon: 'grid' }, { label: 'Catálogos', route: '/catalogos', icon: 'grid' },
    { label: 'Producción', route: '/produccion', icon: 'grid' }, { label: 'Portal académico', route: '/portal', icon: 'grid' },
    { label: 'Reportes', route: '/reportes', icon: 'grid' }, { label: 'Configuración', route: '/configuracion', icon: 'settings' },
  ],
  ESTUDIANTE: [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' }, { label: 'Proyectos', route: '/proyectos', icon: 'grid' },
    { label: 'Costeo', route: '/costeo', icon: 'grid' }, { label: 'Catálogos', route: '/catalogos', icon: 'grid' }, { label: 'Producción', route: '/produccion', icon: 'grid' },
    { label: 'Portal académico', route: '/portal', icon: 'grid' }, { label: 'Reportes', route: '/reportes', icon: 'grid' },
    { label: 'Configuración', route: '/configuracion', icon: 'settings' },
  ],
};

@Component({
  selector: 'app-main-layout', standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.component.html', styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly user = computed(() => this.authService.user);
  readonly navItems = computed(() => NAVIGATION[this.user()?.rol ?? 'ESTUDIANTE']);
  readonly initials = computed(() => {
    const user = this.user();
    return user ? `${user.nombre[0] ?? ''}${user.apellido[0] ?? ''}`.toUpperCase() : 'MG';
  });

  logout(): void { this.authService.logout(); void this.router.navigate(['/auth/login']); }
  closeMenu(): void { this.menuOpen.set(false); }
}




