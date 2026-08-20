import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Rol } from './rol.entity';

export enum EstadoUsuario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  BLOQUEADO = 'BLOQUEADO',
}

@Entity({ name: 'usuario' })
export class Usuario {
  @PrimaryColumn({ type: 'bigint' }) id: string;
  @Column({ name: 'rol_id', type: 'bigint' }) rolId: string;
  @Column({ type: 'varchar', length: 100 }) nombre: string;
  @Column({ type: 'varchar', length: 100 }) apellido: string;
  @Column({ type: 'citext' }) correo: string;
  @Column({ name: 'password_hash', type: 'text', select: false }) passwordHash: string;
  @Column({ type: 'enum', enum: EstadoUsuario, enumName: 'estado_usuario' }) estado: EstadoUsuario;
  @Column({ name: 'foto_perfil_storage_key', type: 'text', nullable: true, select: false }) fotoPerfilStorageKey: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @ManyToOne(() => Rol, (rol) => rol.usuarios) @JoinColumn({ name: 'rol_id' }) rol: Rol;
}