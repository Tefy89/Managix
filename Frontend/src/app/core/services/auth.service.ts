import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse, Session, UserRole } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'managix.session';
  private readonly sessionSubject = new BehaviorSubject<Session | null>(this.readSession());
  readonly session$ = this.sessionSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((response) => this.saveSession({ accessToken: response.access_token, user: response.user })));
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.sessionSubject.next(null);
  }

  get token(): string | null {
    return this.sessionSubject.value?.accessToken ?? null;
  }

  get user(): AuthUser | null {
    return this.sessionSubject.value?.user ?? null;
  }

  hasValidSession(): boolean {
    const token = this.token;
    if (!token || this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  redirectByRole(role: UserRole): string {
    return role === 'ADMINISTRADOR' ? '/admin' : '/dashboard';
  }

  private saveSession(session: Session): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private readSession(): Session | null {
    try {
      const value = localStorage.getItem(this.storageKey);
      if (!value) return null;
      const session = JSON.parse(value) as Session;
      return session.accessToken && session.user ? session : null;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      return !payload.exp || payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}

