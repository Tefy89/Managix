import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CosteoService } from './costeo.service';
import { GuardarMedidasDto } from './dto/medidas.dto';
import { CreateVersionCosteoTelaDto, UpdateVersionCosteoTelaDto } from './dto/telas.dto';
import { CreateVersionCosteoInsumoDto, UpdateVersionCosteoInsumoDto } from './dto/insumos.dto';
import { CreateVersionDto, UpdateVersionDto } from './dto/version.dto';
import { ActualizarCalculosBaseDto } from './dto/calculos-base.dto';
import { ActualizarConfiguracionHiloDto, CrearInsumoDesdeCosteoDto, CrearTelaDesdeCosteoDto } from './dto/materiales.dto';
import { ActualizarUtilidadDto } from './dto/costo-final.dto';

type RequestContext = { user: { sub: string; rol: string } };

@UseGuards(JwtAuthGuard)
@Controller()
export class CosteoController {
  constructor(private readonly service: CosteoService) {}

  @Get('proyectos/:proyectoId/versiones-costeo')
  list(@Param('proyectoId', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.list(String(id), request.user); }

  @Post('proyectos/:proyectoId/versiones-costeo')
  create(@Param('proyectoId', ParseIntPipe) id: number, @Body() dto: CreateVersionDto, @Request() request: RequestContext) { return this.service.create(String(id), dto, request.user); }

  @Post('versiones-costeo/:id/nueva-version')
  nuevaVersion(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.nuevaVersion(String(id), request.user); }
  @Post('versiones-costeo/:id/finalizar')
  @HttpCode(HttpStatus.OK)
  finalizar(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.finalizar(String(id), request.user); }

  @Post('versiones-costeo/:id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.cancelar(String(id), request.user); }
  @Get('versiones-costeo/:id/medidas-configuracion')
  config(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.configuracionMedidas(String(id), request.user); }

  @Get('versiones-costeo/:id/medidas')
  medidas(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.medidas(String(id), request.user); }

  @Put('versiones-costeo/:id/medidas')
  guardar(@Param('id', ParseIntPipe) id: number, @Body() dto: GuardarMedidasDto, @Request() request: RequestContext) { return this.service.guardarMedidas(String(id), dto, request.user); }

  @Get('versiones-costeo/:id/materiales')
  materiales(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.materiales(String(id), request.user); }

  @Patch('versiones-costeo/:id/costo-final/utilidad')
  actualizarUtilidad(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUtilidadDto, @Request() request: RequestContext) { return this.service.actualizarUtilidad(String(id), dto, request.user); }

  @Patch('versiones-costeo/:id/hilo')
  actualizarHilo(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarConfiguracionHiloDto, @Request() request: RequestContext) { return this.service.actualizarHilo(String(id), dto, request.user); }

  @Post('versiones-costeo/:id/catalogos/telas')
  crearTelaDesdeCosteo(@Param('id', ParseIntPipe) id: number, @Body() dto: CrearTelaDesdeCosteoDto, @Request() request: RequestContext) { return this.service.crearTelaDesdeCosteo(String(id), dto, request.user); }

  @Post('versiones-costeo/:id/catalogos/insumos')
  crearInsumoDesdeCosteo(@Param('id', ParseIntPipe) id: number, @Body() dto: CrearInsumoDesdeCosteoDto, @Request() request: RequestContext) { return this.service.crearInsumoDesdeCosteo(String(id), dto, request.user); }

  @Get('versiones-costeo/:id/telas')
  telas(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.telasVersion(String(id), request.user); }

  @Post('versiones-costeo/:id/telas')
  agregarTela(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVersionCosteoTelaDto, @Request() request: RequestContext) { return this.service.agregarTela(String(id), dto, request.user); }

  @Patch('versiones-costeo/:id/telas/:lineaId')
  actualizarTela(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineaId', ParseIntPipe) lineaId: number,
    @Body() dto: UpdateVersionCosteoTelaDto,
    @Request() request: RequestContext,
  ) { return this.service.actualizarTela(String(id), String(lineaId), dto, request.user); }

  @Delete('versiones-costeo/:id/telas/:lineaId')
  retirarTela(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineaId', ParseIntPipe) lineaId: number,
    @Request() request: RequestContext,
  ) { return this.service.retirarTela(String(id), String(lineaId), request.user); }
  @Get('versiones-costeo/:id/insumos')
  insumos(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.insumosVersion(String(id), request.user); }

  @Post('versiones-costeo/:id/insumos')
  agregarInsumo(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVersionCosteoInsumoDto, @Request() request: RequestContext) { return this.service.agregarInsumo(String(id), dto, request.user); }

  @Patch('versiones-costeo/:id/insumos/:lineaId')
  actualizarInsumo(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number, @Body() dto: UpdateVersionCosteoInsumoDto, @Request() request: RequestContext) { return this.service.actualizarInsumo(String(id), String(lineaId), dto, request.user); }

  @Delete('versiones-costeo/:id/insumos/:lineaId')
  retirarInsumo(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number, @Request() request: RequestContext) { return this.service.retirarInsumo(String(id), String(lineaId), request.user); }
  @Get('versiones-costeo/:id/calculos-base')
  calculosBase(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.calculosBase(String(id), request.user); }

  @Put('versiones-costeo/:id/calculos-base')
  actualizarCalculosBase(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarCalculosBaseDto, @Request() request: RequestContext) { return this.service.actualizarCalculosBase(String(id), dto, request.user); }

  @Post('versiones-costeo/:id/calculos-base/recalcular')
  recalcularCalculosBase(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.recalcularCalculosBase(String(id), request.user); }

  @Get('versiones-costeo/:id')
  one(@Param('id', ParseIntPipe) id: number, @Request() request: RequestContext) { return this.service.one(String(id), request.user); }

  @Patch('versiones-costeo/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVersionDto, @Request() request: RequestContext) { return this.service.update(String(id), dto, request.user); }
}






