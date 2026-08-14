import { Routes } from '@angular/router';
import { CatalogosComponent } from './catalogos.component';
export const CATALOGOS_ROUTES: Routes = [
  { path: '', component: CatalogosComponent },
  { path: ':seccion', component: CatalogosComponent },
];
