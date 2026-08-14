import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { EstadoUsuario, Usuario } from './entities/usuario.entity';
import { JwtPayload, LoginResponse, toAuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login({ correo, password }: LoginDto): Promise<LoginResponse> {
    const usuario = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('usuario.correo = :correo', { correo: correo.trim() })
      .getOne();

    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña inválidos.');
    }

    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new UnauthorizedException('El usuario no tiene acceso habilitado.');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      rol: usuario.rol.nombre,
      correo: usuario.correo,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: toAuthenticatedUser(usuario),
    };
  }

  async getAuthenticatedUser(id: string) {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      relations: { rol: true },
    });

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new UnauthorizedException('El usuario no tiene acceso habilitado.');
    }

    return toAuthenticatedUser(usuario);
  }
}
