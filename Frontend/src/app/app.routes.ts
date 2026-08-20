import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { DocenteGuard } from './core/guards/docente.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

const placeholder = (title: string) => ({ data: { title }, loadChildren: () => import('./features/navigation-placeholder/navigation-placeholder.routes').then((routes) => routes.NAVIGATION_PLACEHOLDER_ROUTES) });

export const routes: Routes = [
  { path: 'auth', component: AuthLayoutComponent, children: [{ path: 'login', loadChildren: () => import('./features/auth/auth.routes').then((routes) => routes.AUTH_ROUTES) }, { path: '', redirectTo: 'login', pathMatch: 'full' }] },
  { path: '', component: MainLayoutComponent, canActivateChild: [AuthGuard], children: [
    { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then((routes) => routes.DASHBOARD_ROUTES) },
    { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then((routes) => routes.ADMIN_ROUTES) },
    { path: 'proyectos/:proyectoId/versiones-costeo', loadComponent: () => import('./features/costeo/components/costeo-list.component').then(component => component.CosteoListComponent) },
    { path: 'versiones-costeo/:id', loadComponent: () => import('./features/costeo/components/costeo-detail.component').then(component => component.CosteoDetailComponent) },
    { path: 'proyectos', loadChildren: () => import('./features/proyectos/proyectos.routes').then((routes) => routes.PROYECTOS_ROUTES) },
    { path: 'costeo', loadChildren: () => import('./features/costeo/costeo.routes').then((routes) => routes.COSTEO_ROUTES) },
    { path: 'produccion', loadChildren: () => import('./features/produccion/produccion.routes').then((routes) => routes.PRODUCCION_ROUTES) },
    { path: 'revisiones', canActivate: [DocenteGuard], loadChildren: () => import('./features/revisiones/revisiones.routes').then((routes) => routes.REVISIONES_ROUTES) },
    { path: 'portal', loadChildren: () => import('./features/portal/portal.routes').then((routes) => routes.PORTAL_ROUTES) },
    { path: 'reportes', loadChildren: () => import('./features/reportes/reportes.routes').then((routes) => routes.REPORTES_ROUTES) },
    { path: 'ficha-diseno', loadChildren: () => import('./features/ficha-diseno/ficha-diseno.routes').then((routes) => routes.FICHA_DISENO_ROUTES) },
    { path: 'proyectos/:proyectoId/ficha-diseno', loadComponent: () => import('./features/ficha-diseno/ficha-diseno.component').then(component => component.FichaDisenoComponent) },
    { path: 'ficha-tecnica', ...placeholder('Ficha técnica') },
    { path: 'auditoria', canActivate: [AdminGuard], loadComponent: () => import('./features/auditoria/auditoria.component').then(component => component.AuditoriaComponent) },
    { path: 'usuarios', canActivateChild: [AdminGuard], loadChildren: () => import('./features/usuarios/usuarios.routes').then(r => r.USUARIOS_ROUTES) }, { path: 'catalogos', loadChildren: () => import('./features/catalogos/catalogos.routes').then(r => r.CATALOGOS_ROUTES) }, { path: 'configuracion', loadChildren: () => import('./features/configuracion/configuracion.routes').then(r => r.CONFIGURACION_ROUTES) },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  ] },
  { path: '**', redirectTo: 'auth/login' },
];






