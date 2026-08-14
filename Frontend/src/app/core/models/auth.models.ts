export type UserRole = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';

export interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: UserRole;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface Session {
  accessToken: string;
  user: AuthUser;
}

