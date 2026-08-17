import { Routes } from '@angular/router';
import { RevisionesComponent } from './revisiones.component';
export const REVISIONES_ROUTES: Routes=[{path:'',component:RevisionesComponent},{path:':ordenId/:etapaId',loadComponent:()=>import('./components/revision-detail.component').then(c=>c.RevisionDetailComponent)}];
