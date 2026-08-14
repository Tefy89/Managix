import { Injectable } from '@angular/core';
import { CanActivateChild, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canActivateChild(): boolean | UrlTree {
    return this.authService.hasValidSession()
      ? true
      : this.router.createUrlTree(['/auth/login']);
  }
}

