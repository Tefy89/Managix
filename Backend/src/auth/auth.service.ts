import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { EstadoUsuario, Usuario } from './entities/usuario.entity';
import { JwtPayload, LoginResponse, toAuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(Usuario) private readonly usuariosRepository: Repository<Usuario>, private readonly jwtService: JwtService) {}

  async login({ correo, password }: LoginDto): Promise<LoginResponse> {
    const usuario = await this.usuariosRepository.createQueryBuilder('usuario').addSelect('usuario.passwordHash').addSelect('usuario.fotoPerfilStorageKey').leftJoinAndSelect('usuario.rol', 'rol').where('usuario.correo = :correo', { correo: correo.trim() }).getOne();
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) throw new UnauthorizedException('Correo o contraseña inválidos.');
    if (usuario.estado !== EstadoUsuario.ACTIVO) throw new UnauthorizedException('El usuario no tiene acceso habilitado.');
    const payload: JwtPayload = { sub: usuario.id, rol: usuario.rol.nombre, correo: usuario.correo };
    return { access_token: await this.jwtService.signAsync(payload), user: toAuthenticatedUser(usuario) };
  }

  async getAuthenticatedUser(id: string) {
    const usuario = await this.usuarioConFoto(id);
    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) throw new UnauthorizedException('El usuario no tiene acceso habilitado.');
    return toAuthenticatedUser(usuario);
  }

  async subirFotoPerfil(id: string, archivo: { mimetype: string; size: number; buffer: Buffer } | undefined) {
    if (!archivo || !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.mimetype) || archivo.size > 5 * 1024 * 1024) throw new BadRequestException('La foto debe ser JPG, PNG o WEBP y no superar 5 MB.');
    const usuario = await this.usuarioConFoto(id);
    if (!usuario) throw new UnauthorizedException('El usuario no tiene acceso habilitado.');
    const extension = archivo.mimetype === 'image/png' ? 'png' : archivo.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const key = `${Date.now()}.${extension}`;
    const dir = join(process.cwd(), 'uploads', 'perfiles', id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, key), archivo.buffer);
    if (usuario.fotoPerfilStorageKey) await fs.rm(join(dir, usuario.fotoPerfilStorageKey), { force: true });
    usuario.fotoPerfilStorageKey = key;
    await this.usuariosRepository.save(usuario);
    return { tieneFotoPerfil: true };
  }

  async fotoPerfil(id: string) {
    const usuario = await this.usuarioConFoto(id);
    if (!usuario?.fotoPerfilStorageKey) throw new NotFoundException('No hay foto de perfil configurada.');
    const path = join(process.cwd(), 'uploads', 'perfiles', id, usuario.fotoPerfilStorageKey);
    try { await fs.access(path); } catch { throw new NotFoundException('La foto de perfil no está disponible.'); }
    return { path, mime: usuario.fotoPerfilStorageKey.endsWith('.png') ? 'image/png' : usuario.fotoPerfilStorageKey.endsWith('.webp') ? 'image/webp' : 'image/jpeg' };
  }

  async eliminarFotoPerfil(id: string) {
    const usuario = await this.usuarioConFoto(id);
    if (!usuario) throw new UnauthorizedException('El usuario no tiene acceso habilitado.');
    if (usuario.fotoPerfilStorageKey) await fs.rm(join(process.cwd(), 'uploads', 'perfiles', id, usuario.fotoPerfilStorageKey), { force: true });
    usuario.fotoPerfilStorageKey = null;
    await this.usuariosRepository.save(usuario);
    return { tieneFotoPerfil: false };
  }

  private usuarioConFoto(id: string) { return this.usuariosRepository.createQueryBuilder('usuario').addSelect('usuario.fotoPerfilStorageKey').leftJoinAndSelect('usuario.rol', 'rol').where('usuario.id = :id', { id }).getOne(); }
}