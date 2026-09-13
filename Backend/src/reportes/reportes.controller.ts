import { Controller, Get, Param, ParseIntPipe, Post, Query, Request, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportesQueryDto } from './dto/reportes-query.dto';
import { ReportesService } from './reportes.service';
type AuthRequest = { user: { sub: string; rol: string } };
@UseGuards(JwtAuthGuard)
@Controller()
export class ReportesController {
  constructor(private readonly service: ReportesService) {}
  @Get('reportes') listar(@Query() query: ReportesQueryDto, @Request() request: AuthRequest) { return this.service.listar(query, request.user); }
  @Get('reportes/:id') detalle(@Param('id', ParseIntPipe) id: number, @Request() request: AuthRequest) { return this.service.detalle(String(id), request.user); }
  @Get('reportes/:id/archivo') async archivo(@Param('id', ParseIntPipe) id: number, @Request() request: AuthRequest) { const archivo = await this.service.archivo(String(id), request.user); return new StreamableFile(archivo.stream, { type: 'application/pdf', disposition: `attachment; filename="${archivo.nombre}"` }); }
  @Post('versiones-costeo/:versionId/reportes/cotizacion') generarCotizacion(@Param('versionId', ParseIntPipe) versionId: number, @Request() request: AuthRequest) { return this.service.generarCotizacion(String(versionId), request.user); }
  @Post('versiones-costeo/:versionId/reportes/ficha-diseno') generarFichaDiseno(@Param('versionId', ParseIntPipe) versionId: number, @Request() request: AuthRequest) { return this.service.generarFichaDiseno(String(versionId), request.user); }
  @Post('versiones-costeo/:versionId/reportes/ficha-tecnica') generarFichaTecnica(@Param('versionId', ParseIntPipe) versionId: number, @Request() request: AuthRequest) { return this.service.generarFichaTecnicaNueva(String(versionId), request.user); }
  @Post('versiones-costeo/:versionId/reportes/ficha-orden-operacional') generarFichaOrden(@Param('versionId', ParseIntPipe) versionId: number, @Request() request: AuthRequest) { return this.service.generarFichaOrdenOperacional(String(versionId), request.user); }
  @Post('versiones-costeo/:versionId/reportes/ficha-costos') generarFichaCostos(@Param('versionId', ParseIntPipe) versionId: number, @Request() request: AuthRequest) { return this.service.generarFichaCostos(String(versionId), request.user); }
  @Post('proyectos/:proyectoId/reportes/proyecto') generarProyecto(@Param('proyectoId', ParseIntPipe) proyectoId: number, @Request() request: AuthRequest) { return this.service.generarReporteProyecto(String(proyectoId), request.user); }
  @Post('ordenes-produccion/:ordenId/reportes/orden-produccion') generarOrden(@Param('ordenId', ParseIntPipe) ordenId: number, @Request() request: AuthRequest) { return this.service.generarOrdenProduccion(String(ordenId), request.user); }
}