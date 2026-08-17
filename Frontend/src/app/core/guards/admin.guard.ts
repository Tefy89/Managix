import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate, CanActivateChild {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}
  canActivate(): boolean | UrlTree { return this.autorizar(); }
  canActivateChild(): boolean | UrlTree { return this.autorizar(); }
  private autorizar(): boolean | UrlTree { return this.auth.user?.rol === 'ADMINISTRADOR' || this.router.createUrlTree([this.auth.redirectByRole(this.auth.user?.rol ?? 'ESTUDIANTE')]); }
}
