import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
@Injectable({ providedIn:'root' })
export class DocenteGuard implements CanActivate { constructor(private readonly auth:AuthService,private readonly router:Router){} canActivate():boolean|UrlTree{return this.auth.user?.rol==='DOCENTE'||this.router.createUrlTree([this.auth.redirectByRole(this.auth.user?.rol??'ESTUDIANTE')]);} }
