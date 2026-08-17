import { Routes } from '@angular/router';
import { ProduccionComponent } from './produccion.component';
export const PRODUCCION_ROUTES: Routes = [{ path:'', component:ProduccionComponent },{ path:':id', loadComponent:()=>import('./components/produccion-detail.component').then(c=>c.ProduccionDetailComponent) }];
