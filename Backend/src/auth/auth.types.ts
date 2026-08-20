import { Usuario } from './entities/usuario.entity';

export interface JwtPayload { sub: string; rol: string; correo: string; }
export interface AuthenticatedUser { id: string; nombre: string; apellido: string; correo: string; rol: string; tieneFotoPerfil: boolean; }
export interface LoginResponse { access_token: string; user: AuthenticatedUser; }
export const toAuthenticatedUser = (usuario: Usuario): AuthenticatedUser => ({ id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, correo: usuario.correo, rol: usuario.rol.nombre, tieneFotoPerfil: !!usuario.fotoPerfilStorageKey });