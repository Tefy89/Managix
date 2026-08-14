// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MANAGIX â€” Modelos de dominio
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fotoPerfil?: string;
  createdAt: string;
}

export interface LoginRequest  { email: string; password: string; }
export interface LoginResponse { accessToken: string; usuario: Usuario; }

export type EstadoProyecto =
  | 'BORRADOR' | 'EN_COSTEO' | 'EN_REVISION'
  | 'EN_PRODUCCION' | 'COMPLETADO' | 'ARCHIVADO';

export interface Proyecto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoProyecto;
  estudianteId: number;
  estudiante?: Usuario;
  createdAt: string;
  updatedAt: string;
}

export type EstadoCosteo = 'BORRADOR' | 'EN_REVISION' | 'APROBADO';

export interface VersionCosteo {
  id: number;
  proyectoId: number;
  version: number;
  estado: EstadoCosteo;
  tipoPrendaId: number;
  totalMateriales: number;
  porcentajeManoObra: number;
  montoManoObra: number;
  costoProduccion: number;
  porcentajeGanancia: number;
  montoGanancia: number;
  precioSugerido: number;
  createdAt: string;
}

export type EstadoEtapa = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';

export interface EtapaProduccion {
  id: number;
  ordenProduccionId: number;
  nombre: string;
  orden: number;
  estado: EstadoEtapa;
  observaciones?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export * from './auth.models';

