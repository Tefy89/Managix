import { Routes } from '@angular/router';
import { FichaDisenoComponent } from './ficha-diseno.component';
export const FICHA_DISENO_ROUTES: Routes = [{ path: '', component: FichaDisenoComponent }, { path: ':proyectoId', component: FichaDisenoComponent }];