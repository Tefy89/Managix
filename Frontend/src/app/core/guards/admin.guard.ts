import { Injectable } from '@angular/core'; import { CanActivateChild, Router, UrlTree } from '@angular/router'; import { AuthService } from '../services/auth.service';
@Injectable({providedIn:'root'}) export class AdminGuard implements CanActivateChild {constructor(private auth:AuthService,private router:Router){} canActivateChild():boolean|UrlTree{return this.auth.user?.rol==='ADMINISTRADOR'||this.router.createUrlTree([this.auth.redirectByRole(this.auth.user?.rol??'ESTUDIANTE')])}}

