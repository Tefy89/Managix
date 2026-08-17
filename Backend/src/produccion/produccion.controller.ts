import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Request, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrdenProduccionDto, ListOrdenesProduccionDto } from './dto/orden-produccion.dto';
import { UpdateObservacionEtapaDto } from './dto/orden-produccion-etapa.dto';
import { UploadEvidenciaDto } from './dto/evidencia-etapa.dto';
import { CreateRevisionEtapaDto, ListRevisionEtapasDto } from './dto/revision-etapa.dto';
import { ProduccionService } from './produccion.service';
type RequestContext = { user: { sub: string; rol: string } };
@UseGuards(JwtAuthGuard) @Controller()
export class ProduccionController {
  constructor(private readonly service: ProduccionService) {}
  @Post('versiones-costeo/:versionId/orden-produccion') create(@Param('versionId', ParseIntPipe) versionId: number, @Body() dto: CreateOrdenProduccionDto, @Request() request: RequestContext) { return this.service.create(String(versionId), dto, request.user); }
  @Get('versiones-costeo/:versionId/orden-produccion') byVersion(@Param('versionId', ParseIntPipe) versionId: number, @Request() request: RequestContext) { return this.service.byVersion(String(versionId), request.user); }
  @Post('ordenes-produccion/:id/iniciar')
  @HttpCode(HttpStatus.OK)
  iniciar(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.iniciar(String(id), request.user); }
  @Get('ordenes-produccion/:id/etapas') etapas(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.etapas(String(id), request.user); }
  @Get('ordenes-produccion/:id/etapas/:etapaId') etapa(@Param('id', ParseIntPipe) id: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Request() request: RequestContext) { return this.service.etapa(String(id), String(etapaId), request.user); }
  @Patch('ordenes-produccion/:id/etapas/:etapaId') actualizarObservacion(@Param('id', ParseIntPipe) id: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Body() dto: UpdateObservacionEtapaDto, @Request() request: RequestContext) { return this.service.actualizarObservacion(String(id), String(etapaId), dto, request.user); }  @Get('ordenes-produccion/:ordenId/etapas/:etapaId/evidencias') evidencias(@Param('ordenId', ParseIntPipe) ordenId: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Request() request: RequestContext) { return this.service.evidenciasEtapa(String(ordenId), String(etapaId), request.user); }
  @Post('ordenes-produccion/:ordenId/etapas/:etapaId/evidencias')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }))
  subirEvidencia(@Param('ordenId', ParseIntPipe) ordenId: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Body() dto: UploadEvidenciaDto, @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined, @Request() request: RequestContext) { return this.service.subirEvidencia(String(ordenId), String(etapaId), dto, file, request.user); }
  @Delete('ordenes-produccion/:ordenId/etapas/:etapaId/evidencias/:evidenciaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminarEvidencia(@Param('ordenId', ParseIntPipe) ordenId: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Param('evidenciaId', ParseIntPipe) evidenciaId: number, @Request() request: RequestContext) { return this.service.eliminarEvidencia(String(ordenId), String(etapaId), String(evidenciaId), request.user); }
  @Get('evidencias/:id/archivo')
  async archivo(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext): Promise<StreamableFile> { const archivo = await this.service.archivoEvidencia(String(id), request.user); return new StreamableFile(createReadStream(archivo.ruta), { type: archivo.evidencia.mimeType, disposition: `inline; filename="${archivo.evidencia.nombreOriginalArchivo}"` }); }
  @Post('ordenes-produccion/:ordenId/etapas/:etapaId/completar')
  @HttpCode(HttpStatus.OK)
  completar(@Param('ordenId', ParseIntPipe) ordenId: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Request() request: RequestContext) { return this.service.completarEtapa(String(ordenId), String(etapaId), request.user); }  @Post('ordenes-produccion/:ordenId/etapas/:etapaId/revisiones') crearRevision(@Param('ordenId', ParseIntPipe) ordenId: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Body() dto: CreateRevisionEtapaDto, @Request() request: RequestContext) { return this.service.crearRevision(String(ordenId), String(etapaId), dto, request.user); }
  @Get('ordenes-produccion/:ordenId/etapas/:etapaId/revisiones') revisiones(@Param('ordenId', ParseIntPipe) ordenId: number, @Param('etapaId', ParseIntPipe) etapaId: number, @Request() request: RequestContext) { return this.service.revisionesEtapa(String(ordenId), String(etapaId), request.user); }
  @Get('revisiones/etapas') listadoRevisiones(@Query() filters: ListRevisionEtapasDto, @Request() request: RequestContext) { return this.service.listadoRevisiones(filters, request.user); }  @Get('ordenes-produccion') list(@Query() filters: ListOrdenesProduccionDto, @Request() request: RequestContext) { return this.service.list(filters, request.user); }
  @Get('ordenes-produccion/:id') one(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.one(String(id), request.user); }
}




