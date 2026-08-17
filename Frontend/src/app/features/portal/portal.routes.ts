import { Routes } from '@angular/router';
import { PortalComponent } from './portal.component';

export const PORTAL_ROUTES: Routes = [
  { path: '', component: PortalComponent },
  { path: ':id', loadComponent: () => import('./components/portal-detail.component').then(component => component.PortalDetailComponent) },
];