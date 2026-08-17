import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion, TipoNotificacion } from './entities/notificacion.entity';
type UsuarioAutenticado = { sub: string; rol: string };
@Injectable()
export class NotificacionesService {
  constructor(@InjectRepository(Notificacion) private readonly notificaciones: Repository<Notificacion>) {}
  async list(usuario: UsuarioAutenticado, leida?: string, tipo?: TipoNotificacion) { const where: { usuarioId: string; leida?: boolean; tipo?: TipoNotificacion } = { usuarioId: usuario.sub }; if (leida !== undefined) { if (!['true', 'false'].includes(leida)) throw new BadRequestException('El filtro leida debe ser true o false.'); where.leida = leida === 'true'; } if (tipo) where.tipo = tipo; return this.notificaciones.find({ where, order: { createdAt: 'DESC', id: 'DESC' } }); }
  async leer(id: string, usuario: UsuarioAutenticado) { const notificacion = await this.notificaciones.findOneBy({ id, usuarioId: usuario.sub }); if (!notificacion) { const existe = await this.notificaciones.existsBy({ id }); if (existe) throw new NotFoundException('Notificación no disponible para el usuario.'); throw new NotFoundException('Notificación no encontrada.'); } if (!notificacion.leida) { notificacion.leida = true; notificacion.fechaLectura = new Date(); await this.notificaciones.save(notificacion); } return notificacion; }
  async leerTodas(usuario: UsuarioAutenticado) { await this.notificaciones.createQueryBuilder().update(Notificacion).set({ leida: true, fechaLectura: new Date() }).where('usuario_id = :usuarioId', { usuarioId: usuario.sub }).andWhere('leida = false').execute(); return { updated: true }; }
  async countNoLeidas(usuario: UsuarioAutenticado) { return { count: await this.notificaciones.countBy({ usuarioId: usuario.sub, leida: false }) }; }
}
