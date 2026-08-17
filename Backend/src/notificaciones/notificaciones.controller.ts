import { Controller, Get, Param, ParseIntPipe, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TipoNotificacion } from './entities/notificacion.entity';
import { NotificacionesService } from './notificaciones.service';
type RequestContext = { user: { sub: string; rol: string } };
@UseGuards(JwtAuthGuard) @Controller('notificaciones')
export class NotificacionesController { constructor(private readonly service: NotificacionesService) {} @Get() list(@Request() request: RequestContext, @Query('leida') leida?: string, @Query('tipo') tipo?: TipoNotificacion) { return this.service.list(request.user, leida, tipo); } @Patch('leer-todas') leerTodas(@Request() request: RequestContext) { return this.service.leerTodas(request.user); } @Get('no-leidas/count') count(@Request() request: RequestContext) { return this.service.countNoLeidas(request.user); } @Patch(':id/leer') leer(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.leer(String(id), request.user); } }
