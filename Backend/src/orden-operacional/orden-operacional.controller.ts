import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdenOperacionalService } from './orden-operacional.service';
import { CreateDetalleOrdenDto, CreateMaquinariaDto, EstadoMaquinariaDto, ReordenarOrdenDto, UpdateDetalleOrdenDto, UpdateMaquinariaDto } from './dto/orden-operacional.dto';
import { EstadoCatalogo } from '../auth/entities/rol.entity';

type R = { user: { sub: string; rol: string } };
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OrdenOperacionalController {
  constructor(private readonly service: OrdenOperacionalService) {}
  @Get('maquinarias') listarMaquinaria(@Query() q: { estado?: EstadoCatalogo; search?: string }) { return this.service.listarMaquinaria(q); }
  @Get('maquinarias/:id') unaMaquinaria(@Param('id', ParseIntPipe) id: number) { return this.service.unaMaquinaria(String(id)); }
  @Post('maquinarias') @Roles('ADMINISTRADOR') crearMaquinaria(@Body() dto: CreateMaquinariaDto, @Request() req: R) { return this.service.crearMaquinaria(dto, req.user); }
  @Patch('maquinarias/:id') @Roles('ADMINISTRADOR') editarMaquinaria(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaquinariaDto, @Request() req: R) { return this.service.actualizarMaquinaria(String(id), dto, req.user); }
  @Patch('maquinarias/:id/estado') @Roles('ADMINISTRADOR') estadoMaquinaria(@Param('id', ParseIntPipe) id: number, @Body() dto: EstadoMaquinariaDto, @Request() req: R) { return this.service.estadoMaquinaria(String(id), dto, req.user); }
  @Get('versiones-costeo/:id/orden-operacional') obtener(@Param('id', ParseIntPipe) id: number, @Request() req: R) { return this.service.obtener(String(id), req.user); }
  @Post('versiones-costeo/:id/orden-operacional/detalles') agregar(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateDetalleOrdenDto, @Request() req: R) { return this.service.agregarDetalle(String(id), dto, req.user); }
  @Patch('versiones-costeo/:id/orden-operacional/detalles/:detalleId') editar(@Param('id', ParseIntPipe) id: number, @Param('detalleId', ParseIntPipe) detalleId: number, @Body() dto: UpdateDetalleOrdenDto, @Request() req: R) { return this.service.actualizarDetalle(String(id), String(detalleId), dto, req.user); }
  @Delete('versiones-costeo/:id/orden-operacional/detalles/:detalleId') retirar(@Param('id', ParseIntPipe) id: number, @Param('detalleId', ParseIntPipe) detalleId: number, @Request() req: R) { return this.service.retirarDetalle(String(id), String(detalleId), req.user); }
  @Patch('versiones-costeo/:id/orden-operacional/reordenar') reordenar(@Param('id', ParseIntPipe) id: number, @Body() dto: ReordenarOrdenDto, @Request() req: R) { return this.service.reordenar(String(id), dto, req.user); }
}