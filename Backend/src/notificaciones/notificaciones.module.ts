import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
@Module({ imports: [TypeOrmModule.forFeature([Notificacion])], controllers: [NotificacionesController], providers: [NotificacionesService] }) export class NotificacionesModule {}
