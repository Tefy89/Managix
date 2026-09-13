import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EstadoCatalogo } from '../auth/entities/rol.entity';
import { Auditoria, AccionAuditoria } from '../administracion/entities/auditoria.entity';
import { ConfiguracionGeneral } from '../administracion/entities/configuracion-general.entity';
import { Insumo, ReglaConsumoTela, Tela, TipoPrenda } from '../catalogos/entities/catalogos.entities';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { GuardarMedidasDto } from './dto/medidas.dto';
import { CreateVersionCosteoInsumoDto, UpdateVersionCosteoInsumoDto } from './dto/insumos.dto';
import { CreateVersionCosteoTelaDto, UpdateVersionCosteoTelaDto } from './dto/telas.dto';
import { CreateVersionDto, UpdateVersionDto } from './dto/version.dto';
import { ActualizarCalculosBaseDto } from './dto/calculos-base.dto';
import { ActualizarConfiguracionHiloDto, CrearInsumoDesdeCosteoDto, CrearTelaDesdeCosteoDto } from './dto/materiales.dto';
import { ActualizarUtilidadDto } from './dto/costo-final.dto';
import { calcularCostoFinal } from './final-costeo.calculator';
import { calcularCuadro2Mod } from './calculo-base.calculator';
import { VersionCosteoMedida } from './entities/version-costeo-medida.entity';
import { VersionCosteoCalculoActividad, VersionCosteoCalculoBase } from './entities/version-costeo-calculo-base.entities';
import { VersionCosteoInsumo } from './entities/version-costeo-insumo.entity';
import { VersionCosteoTela } from './entities/version-costeo-tela.entity';
import { VersionCosteoOperacionSam } from '../sam/entities/sam.entities';
import { EstadoVersionCosteo, VersionCosteo } from './entities/version-costeo.entity';
import { OrdenOperacional, OrdenOperacionalDetalle } from '../orden-operacional/entities/orden-operacional.entities';

type UsuarioAutenticado = { sub: string; rol: string };

@Injectable()
export class CosteoService {
  constructor(
    @InjectRepository(VersionCosteo) private readonly versiones: Repository<VersionCosteo>,
    @InjectRepository(VersionCosteoCalculoBase) private readonly calculosBaseRepo: Repository<VersionCosteoCalculoBase>,
    @InjectRepository(VersionCosteoCalculoActividad) private readonly actividadesCalculo: Repository<VersionCosteoCalculoActividad>,
    @InjectRepository(VersionCosteoMedida) private readonly versionesMedidas: Repository<VersionCosteoMedida>,
    @InjectRepository(VersionCosteoTela) private readonly versionesTelas: Repository<VersionCosteoTela>,
    @InjectRepository(VersionCosteoInsumo) private readonly versionesInsumos: Repository<VersionCosteoInsumo>,
    @InjectRepository(Proyecto) private readonly proyectos: Repository<Proyecto>,
    @InjectRepository(TipoPrenda) private readonly tiposPrenda: Repository<TipoPrenda>,
    @InjectRepository(Tela) private readonly telas: Repository<Tela>,
    @InjectRepository(Insumo) private readonly insumos: Repository<Insumo>,
    @InjectRepository(ReglaConsumoTela) private readonly reglasConsumoTela: Repository<ReglaConsumoTela>,
    @InjectRepository(ConfiguracionGeneral) private readonly configuracion: Repository<ConfiguracionGeneral>,
    @InjectRepository(Auditoria) private readonly auditorias: Repository<Auditoria>,
    private readonly dataSource: DataSource,
  ) {}

  async project(id: string, usuario: UsuarioAutenticado) {
    const proyecto = await this.proyectos.findOneBy({ id });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado.');
    if (usuario.rol === 'ESTUDIANTE' && proyecto.estudianteId !== usuario.sub) {
      throw new ForbiddenException('No tiene acceso al proyecto.');
    }
    return proyecto;
  }

  private async conPvpFinal(version: VersionCosteo): Promise<VersionCosteo & { pvpFinal: string | null }> {
    const calculo = await this.calculosBaseRepo.findOneBy({ versionCosteoId: version.id });
    const pvp = calculo && Number(calculo.pvp) > 0 ? calculo.pvp : null;
    return { ...version, pvpFinal: pvp };
  }

  async list(projectId: string, usuario: UsuarioAutenticado) {
    await this.project(projectId, usuario);
    const versiones = await this.versiones.find({ where: { proyectoId: projectId }, order: { numeroVersion: 'ASC' } });
    return Promise.all(versiones.map(version => this.conPvpFinal(version)));
  }

  async one(id: string, usuario: UsuarioAutenticado) {
    const version = await this.versiones.findOneBy({ id });
    if (!version) throw new NotFoundException('Versión no encontrada.');
    await this.project(version.proyectoId, usuario);
    return this.conPvpFinal(version);
  }

  async create(projectId: string, dto: CreateVersionDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes crean versiones.');
    await this.project(projectId, usuario);
    const tipoPrenda = await this.tiposPrenda.findOneBy({ id: dto.tipoPrendaId });
    if (!tipoPrenda) throw new NotFoundException('Tipo de prenda no encontrado.');
    if (tipoPrenda.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('Tipo de prenda inactivo.');
    const configuracion = await this.configuracion.findOneBy({ id: 1 });
    if (!configuracion) throw new NotFoundException('Configuración general no encontrada.');
    const numero = await this.versiones.createQueryBuilder('v')
      .select('COALESCE(MAX(v.numero_version),0)+1', 'n')
      .where('v.proyecto_id=:projectId', { projectId }).getRawOne<{ n: string }>();
    const nextId = await this.versiones.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
    if (!nextId?.id) throw new ConflictException();
    const version = await this.versiones.save(this.versiones.create({
      id: nextId.id, proyectoId: projectId, tipoPrendaId: dto.tipoPrendaId, versionPadreId: null,
      numeroVersion: +(numero?.n ?? 1), nombre: dto.nombre.trim(), descripcion: dto.descripcion?.trim() || null,
      porcentajeManoObra: configuracion.porcentajeManoObraDefecto, porcentajeGanancia: configuracion.porcentajeGananciaDefecto,
      subtotalTelas: '0', subtotalInsumos: '0', subtotalMateriales: '0', valorManoObra: '0',
      valorGanancia: '0', totalCosteo: '0', estado: EstadoVersionCosteo.BORRADOR,
    }));
    await this.inicializarCalculosBase(version.id);
    await this.audit(usuario.sub, AccionAuditoria.CREAR, version.id, 'Versión creada.');
    return version;
  }

  async update(id: string, dto: UpdateVersionDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes editan versiones.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    await this.dataSource.transaction(async (manager) => {
      const versiones = manager.getRepository(VersionCosteo);
      const actual = await versiones.findOneBy({ id });
      if (!actual) throw new NotFoundException('Versión no encontrada.');
      if (dto.tipoPrendaId !== undefined) { const prenda = await this.tiposPrenda.findOneBy({ id: dto.tipoPrendaId }); if (!prenda) throw new NotFoundException('Tipo de prenda no encontrado.'); if (prenda.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('Tipo de prenda inactivo.'); actual.tipoPrendaId = dto.tipoPrendaId; }
      if (dto.nombre !== undefined) actual.nombre = dto.nombre.trim();
      if (dto.descripcion !== undefined) actual.descripcion = dto.descripcion.trim() || null;
      if (dto.porcentajeManoObra !== undefined) actual.porcentajeManoObra = String(dto.porcentajeManoObra);
      if (dto.porcentajeGanancia !== undefined) actual.porcentajeGanancia = String(dto.porcentajeGanancia);
      await this.recalcularCosteoEnTransaccion(actual, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, version.id, 'Versión actualizada.');
    return this.one(id, usuario);
  }

  async nuevaVersion(id: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes crean nuevas versiones.');
    const origen = await this.one(id, usuario);
    if (origen.estado === EstadoVersionCosteo.CANCELADA) {
      throw new BadRequestException('No se puede crear una versión desde una versión CANCELADA.');
    }
    if (origen.estado !== EstadoVersionCosteo.FINALIZADA) {
      throw new BadRequestException('Solo se puede crear una versión desde una versión FINALIZADA.');
    }

    let nueva!: VersionCosteo;
    await this.dataSource.transaction(async (manager) => {
      const versiones = manager.getRepository(VersionCosteo);
      const medidas = manager.getRepository(VersionCosteoMedida);
      const telas = manager.getRepository(VersionCosteoTela);
      const insumos = manager.getRepository(VersionCosteoInsumo);
      const operacionesSam = manager.getRepository(VersionCosteoOperacionSam);
      const fuente = await versiones.findOneBy({ id });
      if (!fuente) throw new NotFoundException('Versión no encontrada.');
      if (fuente.estado !== EstadoVersionCosteo.FINALIZADA) {
        throw new BadRequestException('Solo se puede crear una versión desde una versión FINALIZADA.');
      }

      const siguienteVersion = await versiones.createQueryBuilder('v')
        .select('COALESCE(MAX(v.numero_version),0)+1', 'numero')
        .where('v.proyecto_id = :proyectoId', { proyectoId: fuente.proyectoId })
        .getRawOne<{ numero: string }>();
      const siguienteId = await versiones.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
      nueva = await versiones.save(versiones.create({
        id: siguienteId?.id ?? '0', proyectoId: fuente.proyectoId, tipoPrendaId: fuente.tipoPrendaId,
        versionPadreId: fuente.id, numeroVersion: Number(siguienteVersion?.numero ?? 1),
        nombre: fuente.nombre, descripcion: fuente.descripcion,
        porcentajeManoObra: fuente.porcentajeManoObra, porcentajeGanancia: fuente.porcentajeGanancia,
        subtotalTelas: fuente.subtotalTelas, subtotalInsumos: fuente.subtotalInsumos,
        subtotalMateriales: fuente.subtotalMateriales, valorManoObra: fuente.valorManoObra,
        valorGanancia: fuente.valorGanancia, totalCosteo: fuente.totalCosteo,
        estado: EstadoVersionCosteo.BORRADOR,
      }));

      const [medidasOrigen, telasOrigen, insumosOrigen, samOrigen] = await Promise.all([
        medidas.findBy({ versionCosteoId: fuente.id }),
        telas.findBy({ versionCosteoId: fuente.id }),
        insumos.findBy({ versionCosteoId: fuente.id }),
        operacionesSam.findBy({ versionCosteoId: fuente.id }),
      ]);
      let medidaId = Number((await medidas.createQueryBuilder().select('COALESCE(MAX(id),0)', 'id').getRawOne<{ id: string }>())?.id ?? 0);
      for (const linea of medidasOrigen) {
        medidaId += 1;
        await medidas.save(medidas.create({ id: String(medidaId), versionCosteoId: nueva.id, tipoPrendaMedidaId: linea.tipoPrendaMedidaId, valor: linea.valor }));
      }
      let telaId = Number((await telas.createQueryBuilder().select('COALESCE(MAX(id),0)', 'id').getRawOne<{ id: string }>())?.id ?? 0);
      for (const linea of telasOrigen) {
        telaId += 1;
        await telas.save(telas.create({
          id: String(telaId), versionCosteoId: nueva.id, telaId: linea.telaId,
          cantidadMetrosSugerida: linea.cantidadMetrosSugerida, cantidadMetros: linea.cantidadMetros,
          precioMetroAplicado: linea.precioMetroAplicado, subtotal: linea.subtotal,
          reglaConsumoTelaId: linea.reglaConsumoTelaId, observacion: linea.observacion,
        }));
      }
      let insumoId = Number((await insumos.createQueryBuilder().select('COALESCE(MAX(id),0)', 'id').getRawOne<{ id: string }>())?.id ?? 0);
      for (const linea of insumosOrigen) {
        insumoId += 1;
        await insumos.save(insumos.create({
          id: String(insumoId), versionCosteoId: nueva.id, insumoId: linea.insumoId, cantidad: linea.cantidad,
          unidadMedidaAplicada: linea.unidadMedidaAplicada, precioUnitarioAplicado: linea.precioUnitarioAplicado,
          subtotal: linea.subtotal, observacion: linea.observacion,
        }));
      }
      let samId = Number((await operacionesSam.createQueryBuilder().select('COALESCE(MAX(id),0)', 'id').getRawOne<{ id: string }>())?.id ?? 0);
      for (const linea of samOrigen) { samId += 1; await operacionesSam.save(operacionesSam.create({ id: String(samId), versionCosteoId: nueva.id, operacionSamId: linea.operacionSamId, samAplicado: linea.samAplicado, cantidad: linea.cantidad, subtotalMinutos: linea.subtotalMinutos, observacion: linea.observacion })); }
      const ordenesOperacionales = manager.getRepository(OrdenOperacional);
      const detallesOperacionales = manager.getRepository(OrdenOperacionalDetalle);
      const ordenOrigen = await ordenesOperacionales.findOneBy({ versionCosteoId: fuente.id });
      if (ordenOrigen) {
        const ordenNueva = await ordenesOperacionales.save(ordenesOperacionales.create({ versionCosteoId: nueva.id, totalSegundos: ordenOrigen.totalSegundos, totalCosturaCm: ordenOrigen.totalCosturaCm, totalHiloCm: ordenOrigen.totalHiloCm, totalHiloMetros: ordenOrigen.totalHiloMetros, tiempoRealMinutos: ordenOrigen.tiempoRealMinutos, tiempoEstandarMinutos: ordenOrigen.tiempoEstandarMinutos, porcentajeErrorCronometraje: ordenOrigen.porcentajeErrorCronometraje, porcentajeCapacidad: ordenOrigen.porcentajeCapacidad, porcentajeSuplementos: ordenOrigen.porcentajeSuplementos }));
        const detallesOrigen = await detallesOperacionales.findBy({ ordenOperacionalId: ordenOrigen.id });
        for (const detalle of detallesOrigen) await detallesOperacionales.save(detallesOperacionales.create({ ordenOperacionalId: ordenNueva.id, ordenVisualizacion: detalle.ordenVisualizacion, operacion: detalle.operacion, descripcion: detalle.descripcion, maquinariaId: detalle.maquinariaId, maquinariaNombreAplicada: detalle.maquinariaNombreAplicada, factorHiloAplicado: detalle.factorHiloAplicado, tiempoSegundos: detalle.tiempoSegundos, costuraCm: detalle.costuraCm, cantidadHiloCm: detalle.cantidadHiloCm }));
      }
      await this.clonarCalculosBase(fuente.id, nueva.id, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.CREAR, nueva.id, `Nueva versión creada a partir de la versión ${id}.`, 'version_costeo', {
      version_padre_id: id,
      numero_version: nueva.numeroVersion,
    });
    return nueva;
  }
  private readonly actividadesPredeterminadas = [
    { grupo: 'PATRONAJE_CORTE' as const, codigo: 'PATRONAJE', actividad: 'Patronaje', orden: 1, tarifa: 15 },
    { grupo: 'PATRONAJE_CORTE' as const, codigo: 'DESPIECE', actividad: 'Despiece', orden: 2, tarifa: 15 },
    { grupo: 'PATRONAJE_CORTE' as const, codigo: 'CORTE', actividad: 'Corte', orden: 3, tarifa: 15 },
    { grupo: 'DISENO' as const, codigo: 'CONTACTA_TEMA', actividad: 'Contacta / selección de tema', orden: 4, tarifa: 20 },
    { grupo: 'DISENO' as const, codigo: 'INVESTIGACION', actividad: 'Investigación', orden: 5, tarifa: 20 },
    { grupo: 'DISENO' as const, codigo: 'BOCETAJE', actividad: 'Bocetaje', orden: 6, tarifa: 20 },
    { grupo: 'DISENO' as const, codigo: 'ILUSTRACION', actividad: 'Ilustración', orden: 7, tarifa: 20 },
    { grupo: 'DISENO' as const, codigo: 'SELECCION', actividad: 'Selección', orden: 8, tarifa: 20 },
    { grupo: 'DISENO' as const, codigo: 'FICHAS_TECNICAS', actividad: 'Fichas técnicas', orden: 9, tarifa: 20 },
  ];

  private decimal(valor: number, precision = 6): string {
    return Number(valor.toFixed(precision)).toFixed(precision);
  }

  private async inicializarCalculosBase(versionId: string, manager?: EntityManager): Promise<VersionCosteoCalculoBase> {
    const baseRepo = (manager ?? this.calculosBaseRepo.manager).getRepository(VersionCosteoCalculoBase);
    const actividadRepo = (manager ?? this.actividadesCalculo.manager).getRepository(VersionCosteoCalculoActividad);
    const existente = await baseRepo.findOneBy({ versionCosteoId: versionId });
    if (existente) return existente;
    const parametros = await baseRepo.manager.query('SELECT codigo, valor::text AS valor FROM configuracion_parametro_costeo') as Array<{codigo:string;valor:string}>; const g=(codigo:string,defecto:number)=>Number(parametros.find(x=>x.codigo===codigo)?.valor??defecto);
    const base = await baseRepo.save(baseRepo.create({
      versionCosteoId: versionId, sbu: null, numeroOperarias: 1, semanasMes: g('SEMANAS_MES',4), diasSemana: g('DIAS_SEMANA',5),
      minutosDia: g('MINUTOS_DIA',480), eficiencia: this.decimal(g('EFICIENCIA',80)/100,4), porcentajeIessPatronal:this.decimal(g('IESS_PATRONAL',11.15)/100,6), divisorDecimoTercero:this.decimal(g('DIVISOR_DECIMO_TERCERO',12),4), divisorDecimoCuarto:this.decimal(g('DIVISOR_DECIMO_CUARTO',12),4), porcentajeFondosReserva:this.decimal(g('FONDOS_RESERVA',8.33)/100,6), divisorVacaciones:'24.0000', iessPatronal: '0', decimoTercero: '0', decimoCuarto: '0',
      fondosReserva: '0', vacaciones: '0', totalSalarioMensual: '0', costoMensualMod: '0',
      minutosProductivosMes: this.decimal(4 * 5 * 480 * .8), costoMinutoMod: '0',
      sueldoPersonalAdministrativo: '0', variosMoi: '0', totalMoi: '0', costoMinutoMoi: '0',
      gastosGenerales: '0', arriendo: '0', papeleria: '0', higiene: '0', cafeteria: '0',
      totalGastosGenerales: '0', costoMinutoGastosGenerales: '0', totalHorasPatronajeCorte: '0',
      totalCostoPatronajeCorte: '0', costoMinutoPatronajeCorte: '0', totalHorasDiseno: '0',
      totalCostoDiseno: '0', costoMinutoDiseno: '0', precioPresentacionHilo: this.decimal(g('PRECIO_PRESENTACION_HILO',2.2),6), metrosPresentacionHilo: this.decimal(g('METROS_PRESENTACION_HILO',10000),4), hiloTotalMetros: '0', precioHiloPorMetro: '0', subtotalHilo: '0', tiempoEstandarAplicado: '0', costoModPrenda: '0', costoMoiPrenda: '0', costoGeneralesPrenda: '0', costoPatronajeCortePrenda: '0', costoDisenoPrenda: '0', costoMateriales: '0', costoUnitario: '0', porcentajeUtilidad: '0', valorUtilidad: '0', subtotalVenta: '0', porcentajeIvaAplicado: this.decimal(g('PORCENTAJE_IVA',15),4), valorIva: '0', pvp: '0',
    }));
    await actividadRepo.save(this.actividadesPredeterminadas.map(item => actividadRepo.create({
      versionCosteoCalculoBaseId: base.id, grupo: item.grupo, codigo: item.codigo, actividad: item.actividad,
      ordenVisualizacion: item.orden, horas: '0', tarifaHoraAplicada: this.decimal(g('TARIFA_' + item.codigo, item.tarifa), 2), costo: '0',
    })));
    return this.recalcularBase(base, manager);
  }

  private async recalcularBase(base: VersionCosteoCalculoBase, manager?: EntityManager): Promise<VersionCosteoCalculoBase> {
    const actividadRepo = (manager ?? this.actividadesCalculo.manager).getRepository(VersionCosteoCalculoActividad);
    const baseRepo = (manager ?? this.calculosBaseRepo.manager).getRepository(VersionCosteoCalculoBase);
    const actividades = await actividadRepo.find({ where: { versionCosteoCalculoBaseId: base.id }, order: { ordenVisualizacion: 'ASC' } });
    for (const actividad of actividades) {
      actividad.costo = this.decimal(Number(actividad.horas) * Number(actividad.tarifaHoraAplicada));
      actividad.updatedAt = new Date();
    }
    await actividadRepo.save(actividades);
    const sbu = base.sbu === null ? 0 : Number(base.sbu);
    const iess = sbu * Number(base.porcentajeIessPatronal ?? .1115);
    const decimoTercero = sbu / Number(base.divisorDecimoTercero ?? 12);
    const decimoCuarto = sbu / Number(base.divisorDecimoCuarto ?? 12);
    const fondosReserva = sbu * Number(base.porcentajeFondosReserva ?? .0833);
    const vacaciones = sbu / Number(base.divisorVacaciones ?? 24);
    const totalSalario = sbu + iess + decimoTercero + decimoCuarto + fondosReserva + vacaciones;
    const cuadro2Mod = calcularCuadro2Mod({ totalSalarioMensual: totalSalario, numeroOperarias: base.numeroOperarias, semanasMes: base.semanasMes, diasSemana: base.diasSemana, minutosDia: base.minutosDia, eficiencia: Number(base.eficiencia) });
    const minutos = cuadro2Mod.minutosProductivosMes;
    const costoMensualMod = cuadro2Mod.costoMensualMod;
    const totalMoi = Number(base.sueldoPersonalAdministrativo) + Number(base.variosMoi);
    const totalGastos = Number(base.gastosGenerales) + Number(base.arriendo) + Number(base.papeleria) + Number(base.higiene) + Number(base.cafeteria);
    const patronaje = actividades.filter(item => item.grupo === 'PATRONAJE_CORTE');
    const diseno = actividades.filter(item => item.grupo === 'DISENO');
    const horasPatronaje = patronaje.reduce((sum, item) => sum + Number(item.horas), 0);
    const costoPatronaje = patronaje.reduce((sum, item) => sum + Number(item.costo), 0);
    const horasDiseno = diseno.reduce((sum, item) => sum + Number(item.horas), 0);
    const costoDiseno = diseno.reduce((sum, item) => sum + Number(item.costo), 0);
    base.iessPatronal = this.decimal(iess); base.decimoTercero = this.decimal(decimoTercero); base.decimoCuarto = this.decimal(decimoCuarto);
    base.fondosReserva = this.decimal(fondosReserva); base.vacaciones = this.decimal(vacaciones); base.totalSalarioMensual = this.decimal(totalSalario);
    base.costoMensualMod = this.decimal(costoMensualMod); base.minutosProductivosMes = this.decimal(minutos);
    base.costoMinutoMod = this.decimal(cuadro2Mod.costoMinutoMod);
    base.totalMoi = this.decimal(totalMoi); base.costoMinutoMoi = this.decimal(minutos === 0 ? 0 : totalMoi / minutos);
    base.totalGastosGenerales = this.decimal(totalGastos); base.costoMinutoGastosGenerales = this.decimal(minutos === 0 ? 0 : totalGastos / minutos);
    base.totalHorasPatronajeCorte = this.decimal(horasPatronaje, 4); base.totalCostoPatronajeCorte = this.decimal(costoPatronaje);
    base.costoMinutoPatronajeCorte = this.decimal(minutos === 0 ? 0 : costoPatronaje / minutos);
    base.totalHorasDiseno = this.decimal(horasDiseno, 4); base.totalCostoDiseno = this.decimal(costoDiseno);
    base.costoMinutoDiseno = this.decimal(minutos === 0 ? 0 : costoDiseno / minutos); base.updatedAt = new Date();
    return baseRepo.save(base);
  }

  private async recalcularCalculosBaseEnTransaccion(versionId: string, manager: EntityManager) {
    const base = await this.inicializarCalculosBase(versionId, manager);
    return this.recalcularBase(base, manager);
  }

  private salidaCalculosBase(base: VersionCosteoCalculoBase, actividades: VersionCosteoCalculoActividad[]) {
    const numero = (valor: string | null) => valor === null ? null : Number(valor);
    return {
      id: base.id, versionCosteoId: base.versionCosteoId, sbu: numero(base.sbu), numeroOperarias: base.numeroOperarias,
      parametros: { semanasMes: base.semanasMes, diasSemana: base.diasSemana, minutosDia: base.minutosDia, eficiencia: Number(base.eficiencia) },
      salario: { iessPatronal: Number(base.iessPatronal), decimoTercero: Number(base.decimoTercero), decimoCuarto: Number(base.decimoCuarto), fondosReserva: Number(base.fondosReserva), vacaciones: Number(base.vacaciones), totalSalarioMensual: Number(base.totalSalarioMensual) },
      mod: { costoMensual: Number(base.costoMensualMod), minutosProductivosMes: Number(base.minutosProductivosMes), costoMinuto: Number(base.costoMinutoMod) },
      moi: { sueldoPersonalAdministrativo: Number(base.sueldoPersonalAdministrativo), variosMoi: Number(base.variosMoi), total: Number(base.totalMoi), costoMinuto: Number(base.costoMinutoMoi) },
      gastosGenerales: { gastosGenerales: Number(base.gastosGenerales), arriendo: Number(base.arriendo), papeleria: Number(base.papeleria), higiene: Number(base.higiene), cafeteria: Number(base.cafeteria), total: Number(base.totalGastosGenerales), costoMinuto: Number(base.costoMinutoGastosGenerales) },
      patronajeCorte: { actividades: actividades.filter(item => item.grupo === 'PATRONAJE_CORTE').map(item => ({ codigo: item.codigo, actividad: item.actividad, horas: Number(item.horas), tarifaHora: Number(item.tarifaHoraAplicada), costo: Number(item.costo) })), totalHoras: Number(base.totalHorasPatronajeCorte), totalCosto: Number(base.totalCostoPatronajeCorte), costoMinuto: Number(base.costoMinutoPatronajeCorte) },
      diseno: { actividades: actividades.filter(item => item.grupo === 'DISENO').map(item => ({ codigo: item.codigo, actividad: item.actividad, horas: Number(item.horas), tarifaHora: Number(item.tarifaHoraAplicada), costo: Number(item.costo) })), totalHoras: Number(base.totalHorasDiseno), totalCosto: Number(base.totalCostoDiseno), costoMinuto: Number(base.costoMinutoDiseno) },
      hilo: { precioPresentacion: Number(base.precioPresentacionHilo), metrosPresentacion: Number(base.metrosPresentacionHilo), cantidad: Number(base.hiloTotalMetros), metrosUtilizados: Number(base.hiloTotalMetros), precioBase: Number(base.precioHiloPorMetro), precioPorMetro: Number(base.precioHiloPorMetro), valorUnitario: Number(base.precioHiloPorMetro) * Number(base.hiloTotalMetros), subtotal: Number(base.subtotalHilo) },
      costoFinal: { tiempoEstandar: Number(base.tiempoEstandarAplicado), mod: Number(base.costoModPrenda), moi: Number(base.costoMoiPrenda), generales: Number(base.costoGeneralesPrenda), patronajeCorte: Number(base.costoPatronajeCortePrenda), diseno: Number(base.costoDisenoPrenda), materiales: Number(base.costoMateriales), costoUnitario: Number(base.costoUnitario), porcentajeUtilidad: Number(base.porcentajeUtilidad), valorUtilidad: Number(base.valorUtilidad), subtotalVenta: Number(base.subtotalVenta), porcentajeIva: Number(base.porcentajeIvaAplicado), valorIva: Number(base.valorIva), pvp: Number(base.pvp) },
      createdAt: base.createdAt, updatedAt: base.updatedAt,
    };
  }

  async calculosBase(id: string, usuario: UsuarioAutenticado) {
    await this.one(id, usuario);
    const base = await this.dataSource.transaction(manager => this.inicializarCalculosBase(id, manager));
    const actividades = await this.actividadesCalculo.find({ where: { versionCosteoCalculoBaseId: base.id }, order: { ordenVisualizacion: 'ASC' } });
    return this.salidaCalculosBase(base, actividades);
  }

  async actualizarCalculosBase(id: string, dto: ActualizarCalculosBaseDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes editan los cálculos base.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    if (dto.actividades && new Set(dto.actividades.map(item => item.codigo)).size !== dto.actividades.length) throw new BadRequestException('No se permiten actividades repetidas.');
    await this.dataSource.transaction(async manager => {
      const base = await this.inicializarCalculosBase(id, manager);
      const actividades = manager.getRepository(VersionCosteoCalculoActividad);
      if (dto.sbu !== undefined) base.sbu = this.decimal(dto.sbu, 2);
      if (dto.numeroOperarias !== undefined) base.numeroOperarias = dto.numeroOperarias;
      if (dto.sueldoPersonalAdministrativo !== undefined) base.sueldoPersonalAdministrativo = this.decimal(dto.sueldoPersonalAdministrativo);
      if (dto.variosMoi !== undefined) base.variosMoi = this.decimal(dto.variosMoi);
      if (dto.gastosGenerales !== undefined) base.gastosGenerales = this.decimal(dto.gastosGenerales);
      if (dto.arriendo !== undefined) base.arriendo = this.decimal(dto.arriendo);
      if (dto.papeleria !== undefined) base.papeleria = this.decimal(dto.papeleria);
      if (dto.higiene !== undefined) base.higiene = this.decimal(dto.higiene);
      if (dto.cafeteria !== undefined) base.cafeteria = this.decimal(dto.cafeteria);
      for (const cambio of dto.actividades ?? []) {
        const actividad = await actividades.findOneBy({ versionCosteoCalculoBaseId: base.id, codigo: cambio.codigo });
        if (!actividad) throw new BadRequestException('La actividad no corresponde a la ficha de costos.');
        actividad.horas = this.decimal(cambio.horas, 4);
        actividad.updatedAt = new Date();
        await actividades.save(actividad);
      }
      await this.recalcularBase(base, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, id, 'Cálculos base de la ficha de costos actualizados.', 'version_costeo_calculo_base');
    return this.calculosBase(id, usuario);
  }

  async recalcularCalculosBase(id: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes recalculan los costos base.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    await this.dataSource.transaction(manager => this.recalcularCalculosBaseEnTransaccion(id, manager));
    return this.calculosBase(id, usuario);
  }

  private async clonarCalculosBase(origenVersionId: string, nuevaVersionId: string, manager: EntityManager) {
    const origen = await manager.getRepository(VersionCosteoCalculoBase).findOneBy({ versionCosteoId: origenVersionId });
    if (!origen) { await this.inicializarCalculosBase(nuevaVersionId, manager); return; }
    const destinoRepo = manager.getRepository(VersionCosteoCalculoBase);
    const destino = await destinoRepo.save(destinoRepo.create({
      versionCosteoId: nuevaVersionId, sbu: origen.sbu, numeroOperarias: origen.numeroOperarias, semanasMes: origen.semanasMes,
      diasSemana: origen.diasSemana, minutosDia: origen.minutosDia, eficiencia: origen.eficiencia, porcentajeIessPatronal: origen.porcentajeIessPatronal, divisorDecimoTercero: origen.divisorDecimoTercero, divisorDecimoCuarto: origen.divisorDecimoCuarto, porcentajeFondosReserva: origen.porcentajeFondosReserva, divisorVacaciones: origen.divisorVacaciones, iessPatronal: origen.iessPatronal,
      decimoTercero: origen.decimoTercero, decimoCuarto: origen.decimoCuarto, fondosReserva: origen.fondosReserva, vacaciones: origen.vacaciones,
      totalSalarioMensual: origen.totalSalarioMensual, costoMensualMod: origen.costoMensualMod, minutosProductivosMes: origen.minutosProductivosMes,
      costoMinutoMod: origen.costoMinutoMod, sueldoPersonalAdministrativo: origen.sueldoPersonalAdministrativo, variosMoi: origen.variosMoi,
      totalMoi: origen.totalMoi, costoMinutoMoi: origen.costoMinutoMoi, gastosGenerales: origen.gastosGenerales, arriendo: origen.arriendo,
      papeleria: origen.papeleria, higiene: origen.higiene, cafeteria: origen.cafeteria, totalGastosGenerales: origen.totalGastosGenerales,
      costoMinutoGastosGenerales: origen.costoMinutoGastosGenerales, totalHorasPatronajeCorte: origen.totalHorasPatronajeCorte,
      totalCostoPatronajeCorte: origen.totalCostoPatronajeCorte, costoMinutoPatronajeCorte: origen.costoMinutoPatronajeCorte,
      totalHorasDiseno: origen.totalHorasDiseno, totalCostoDiseno: origen.totalCostoDiseno, costoMinutoDiseno: origen.costoMinutoDiseno, precioPresentacionHilo: origen.precioPresentacionHilo, metrosPresentacionHilo: origen.metrosPresentacionHilo, hiloTotalMetros: origen.hiloTotalMetros, precioHiloPorMetro: origen.precioHiloPorMetro, subtotalHilo: origen.subtotalHilo, tiempoEstandarAplicado: origen.tiempoEstandarAplicado, costoModPrenda: origen.costoModPrenda, costoMoiPrenda: origen.costoMoiPrenda, costoGeneralesPrenda: origen.costoGeneralesPrenda, costoPatronajeCortePrenda: origen.costoPatronajeCortePrenda, costoDisenoPrenda: origen.costoDisenoPrenda, costoMateriales: origen.costoMateriales, costoUnitario: origen.costoUnitario, porcentajeUtilidad: origen.porcentajeUtilidad, valorUtilidad: origen.valorUtilidad, subtotalVenta: origen.subtotalVenta, porcentajeIvaAplicado: origen.porcentajeIvaAplicado, valorIva: origen.valorIva, pvp: origen.pvp,
    }));
    const actividadesOrigen = await manager.getRepository(VersionCosteoCalculoActividad).find({ where: { versionCosteoCalculoBaseId: origen.id }, order: { ordenVisualizacion: 'ASC' } });
    await manager.getRepository(VersionCosteoCalculoActividad).save(actividadesOrigen.map(item => manager.getRepository(VersionCosteoCalculoActividad).create({
      versionCosteoCalculoBaseId: destino.id, grupo: item.grupo, codigo: item.codigo, actividad: item.actividad,
      ordenVisualizacion: item.ordenVisualizacion, horas: item.horas, tarifaHoraAplicada: item.tarifaHoraAplicada, costo: item.costo,
    })));
  }
  async finalizar(id: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes finalizan versiones.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR pueden finalizarse.');
    const faltantes = await this.medidasObligatoriasFaltantes(id, usuario);
    if (faltantes.length > 0) {
      const nombres = faltantes.map((medida: { nombre: string }) => medida.nombre).join(', ');
      throw new BadRequestException(`Faltan medidas obligatorias: ${nombres}.`);
    }
    await this.dataSource.transaction(async (manager) => {
      const versiones = manager.getRepository(VersionCosteo);
      const actual = await versiones.findOneBy({ id });
      if (!actual) throw new NotFoundException('Versión no encontrada.');
      if (actual.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR pueden finalizarse.');
      await this.validarLineasCosteo(id, manager);
      await this.recalcularCosteoEnTransaccion(actual, manager);
      actual.estado = EstadoVersionCosteo.FINALIZADA;
      await versiones.save(actual);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, id, 'Versión de costeo finalizada.');
    return this.one(id, usuario);
  }

  async cancelar(id: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes cancelan versiones.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR pueden cancelarse.');
    await this.dataSource.transaction(async (manager) => {
      const versiones = manager.getRepository(VersionCosteo);
      const actual = await versiones.findOneBy({ id });
      if (!actual) throw new NotFoundException('Versión no encontrada.');
      if (actual.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR pueden cancelarse.');
      actual.estado = EstadoVersionCosteo.CANCELADA;
      await versiones.save(actual);
    });
    await this.audit(usuario.sub, AccionAuditoria.CANCELAR, id, 'Versión de costeo cancelada.');
    return this.one(id, usuario);
  }
  async configuracionMedidas(id: string, usuario: UsuarioAutenticado) {
    const version = await this.one(id, usuario);
    return this.versionesMedidas.manager.query(
      "select r.id as tipo_prenda_medida_id,m.id as medida_id,m.codigo,m.nombre,m.unidad,r.obligatorio,r.orden_visualizacion from tipo_prenda_medida r join medida m on m.id=r.medida_id where r.tipo_prenda_id=$1 and r.estado='ACTIVO' order by r.orden_visualizacion asc",
      [version.tipoPrendaId],
    );
  }

  async medidas(id: string, usuario: UsuarioAutenticado) {
    await this.one(id, usuario);
    return this.versionesMedidas.manager.query(
      'select v.id,v.tipo_prenda_medida_id,m.id as medida_id,m.codigo,m.nombre,m.unidad,r.obligatorio,r.orden_visualizacion,v.valor from version_costeo_medida v join tipo_prenda_medida r on r.id=v.tipo_prenda_medida_id join medida m on m.id=r.medida_id where v.version_costeo_id=$1 order by r.orden_visualizacion asc',
      [id],
    );
  }

  async medidasObligatoriasFaltantes(id: string, usuario: UsuarioAutenticado) {
    const [configuracion, guardadas] = await Promise.all([this.configuracionMedidas(id, usuario), this.medidas(id, usuario)]);
    const guardadasIds = new Set(guardadas.map((medida: { tipo_prenda_medida_id: string }) => String(medida.tipo_prenda_medida_id)));
    return configuracion.filter((medida: { obligatorio: boolean; tipo_prenda_medida_id: string }) =>
      medida.obligatorio && !guardadasIds.has(String(medida.tipo_prenda_medida_id)));
  }

  async guardarMedidas(id: string, dto: GuardarMedidasDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes modifican medidas.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const ids = dto.medidas.map((medida) => String(medida.tipoPrendaMedidaId));
    if (new Set(ids).size !== ids.length) throw new ConflictException('No se permiten medidas duplicadas.');
    const configuracion = await this.configuracionMedidas(id, usuario);
    for (const medida of dto.medidas) {
      if (!configuracion.some((item: { tipo_prenda_medida_id: string }) => String(item.tipo_prenda_medida_id) === String(medida.tipoPrendaMedidaId))) {
        throw new BadRequestException('La medida no corresponde a la prenda activa de la versión.');
      }
    }
    await this.dataSource.transaction(async (manager) => {
      const repositorio = manager.getRepository(VersionCosteoMedida);
      for (const medida of dto.medidas) {
        const actual = await repositorio.findOneBy({ versionCosteoId: id, tipoPrendaMedidaId: String(medida.tipoPrendaMedidaId) });
        if (actual) {
          actual.valor = String(medida.valor);
          await repositorio.save(actual);
        } else {
          const nextId = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
          await repositorio.save(repositorio.create({ id: nextId?.id ?? '0', versionCosteoId: id, tipoPrendaMedidaId: String(medida.tipoPrendaMedidaId), valor: String(medida.valor) }));
        }
      }
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, id, 'Medidas de versión actualizadas.');
    return this.medidas(id, usuario);
  }

  async telasVersion(id: string, usuario: UsuarioAutenticado) {
    await this.one(id, usuario);
    return this.versionesTelas.manager.query(
      'select vt.id,vt.tela_id,t.codigo,t.nombre,\'m\'::text as unidad,vt.cantidad_metros_sugerida,vt.cantidad_metros,vt.precio_metro_aplicado,vt.subtotal,vt.regla_consumo_tela_id,vt.observacion,vt.created_at,vt.updated_at from version_costeo_tela vt join tela t on t.id=vt.tela_id where vt.version_costeo_id=$1 order by vt.id asc,vt.created_at asc',
      [id],
    );
  }

  async agregarTela(id: string, dto: CreateVersionCosteoTelaDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes agregan telas.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const sugerenciaNula = dto.cantidadMetrosSugerida === null || dto.cantidadMetrosSugerida === undefined;
    if (sugerenciaNula && dto.reglaConsumoTelaId !== null && dto.reglaConsumoTelaId !== undefined) {
      throw new BadRequestException('Una regla de consumo requiere una sugerencia válida.');
    }
    const tela = await this.telas.findOneBy({ id: String(dto.telaId) });
    if (!tela) throw new NotFoundException('Tela no encontrada.');
    if (tela.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('Tela inactiva.');
    const duplicada = await this.versionesTelas.findOneBy({ versionCosteoId: id, telaId: String(dto.telaId) });
    if (duplicada) throw new ConflictException('La tela ya está registrada en esta versión.');
    let regla: ReglaConsumoTela | null = null;
    if (dto.reglaConsumoTelaId !== null && dto.reglaConsumoTelaId !== undefined) {
      regla = await this.reglasConsumoTela.findOneBy({ id: String(dto.reglaConsumoTelaId) });
      if (!regla) throw new NotFoundException('Regla de consumo de tela no encontrada.');
      if (regla.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('Regla de consumo de tela inactiva.');
      if (regla.tipoPrendaId !== version.tipoPrendaId) throw new BadRequestException('La regla no corresponde al tipo de prenda de la versión.');
    }
    const cantidad = Number(dto.cantidadMetros);
    const precio = Number(dto.precioMetroAplicado ?? tela.precioMetro);
    const subtotal = this.redondearMoneda(cantidad * precio);
    let linea!: VersionCosteoTela;
    await this.dataSource.transaction(async (manager) => {
      const lineas = manager.getRepository(VersionCosteoTela);
      const versiones = manager.getRepository(VersionCosteo);
      const nextId = await lineas.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
      linea = await lineas.save(lineas.create({
        id: nextId?.id ?? '0', versionCosteoId: id, telaId: String(dto.telaId),
        cantidadMetrosSugerida: dto.cantidadMetrosSugerida ?? null, cantidadMetros: cantidad,
        precioMetroAplicado: precio, subtotal, reglaConsumoTelaId: regla?.id ?? null,
        observacion: dto.observacion?.trim() || null,
      }));
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.CREAR, linea.id, 'Tela agregada a la versión.', 'version_costeo_tela');
    return linea;
  }

  async actualizarTela(id: string, lineaId: string, dto: UpdateVersionCosteoTelaDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes modifican telas.');
    const { version, linea } = await this.lineaTelaEditable(id, lineaId, usuario);
    const siguienteSugerencia = dto.cantidadMetrosSugerida !== undefined
      ? dto.cantidadMetrosSugerida
      : linea.cantidadMetrosSugerida;
    const siguienteReglaId = dto.reglaConsumoTelaId !== undefined
      ? dto.reglaConsumoTelaId
      : linea.reglaConsumoTelaId;

    if (siguienteSugerencia === null && siguienteReglaId !== null) {
      throw new BadRequestException('Una sugerencia no disponible no puede tener regla asociada.');
    }

    let reglaId: string | null = siguienteReglaId === null ? null : String(siguienteReglaId);
    if (reglaId !== null) {
      const regla = await this.reglasConsumoTela.findOneBy({ id: reglaId });
      if (!regla) throw new NotFoundException('Regla de consumo de tela no encontrada.');
      if (regla.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('Regla de consumo de tela inactiva.');
      if (regla.tipoPrendaId !== version.tipoPrendaId) {
        throw new BadRequestException('La regla no corresponde al tipo de prenda de la versión.');
      }
    }

    let actualizada!: VersionCosteoTela;
    await this.dataSource.transaction(async (manager) => {
      const lineas = manager.getRepository(VersionCosteoTela);
      const versiones = manager.getRepository(VersionCosteo);
      const lineaActual = await lineas.findOneBy({ id: linea.id });
      if (!lineaActual || lineaActual.versionCosteoId !== id) throw new NotFoundException('Línea de tela no encontrada.');
      if (dto.cantidadMetros !== undefined) lineaActual.cantidadMetros = Number(dto.cantidadMetros);
      if (dto.precioMetroAplicado !== undefined) lineaActual.precioMetroAplicado = Number(dto.precioMetroAplicado);
      if (dto.cantidadMetrosSugerida !== undefined) lineaActual.cantidadMetrosSugerida = dto.cantidadMetrosSugerida;
      if (dto.reglaConsumoTelaId !== undefined || siguienteSugerencia === null) lineaActual.reglaConsumoTelaId = reglaId;
      if (dto.observacion !== undefined) lineaActual.observacion = dto.observacion.trim() || null;
      lineaActual.subtotal = this.redondearMoneda(Number(lineaActual.cantidadMetros) * Number(lineaActual.precioMetroAplicado));
      actualizada = await lineas.save(lineaActual);
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, actualizada.id, 'Tela de versión actualizada.', 'version_costeo_tela');
    return actualizada;
  }

  async retirarTela(id: string, lineaId: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes retiran telas.');
    const { version, linea } = await this.lineaTelaEditable(id, lineaId, usuario);
    await this.dataSource.transaction(async (manager) => {
      const lineas = manager.getRepository(VersionCosteoTela);
      const versiones = manager.getRepository(VersionCosteo);
      const actual = await lineas.findOneBy({ id: linea.id });
      if (!actual || actual.versionCosteoId !== id) throw new NotFoundException('Línea de tela no encontrada.');
      await lineas.remove(actual);
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, version.id, 'Se retiró una tela del borrador.');
  }

  private async lineaTelaEditable(id: string, lineaId: string, usuario: UsuarioAutenticado) {
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const linea = await this.versionesTelas.findOneBy({ id: lineaId });
    if (!linea || linea.versionCosteoId !== id) throw new NotFoundException('Línea de tela no encontrada.');
    return { version, linea };
  }


  async insumosVersion(id: string, usuario: UsuarioAutenticado) {
    await this.one(id, usuario);
    return this.versionesInsumos.manager.query(
      'select vi.id,vi.insumo_id,i.codigo,i.nombre,vi.cantidad,vi.unidad_medida_aplicada,vi.precio_unitario_aplicado,vi.subtotal,vi.observacion,vi.created_at,vi.updated_at from version_costeo_insumo vi join insumo i on i.id=vi.insumo_id where vi.version_costeo_id=$1 order by vi.id asc,vi.created_at asc',
      [id],
    );
  }

  async agregarInsumo(id: string, dto: CreateVersionCosteoInsumoDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes agregan insumos.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const insumo = await this.insumos.findOneBy({ id: String(dto.insumoId) });
    if (!insumo) throw new NotFoundException('Insumo no encontrado.');
    if (insumo.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('Insumo inactivo.');
    const duplicado = await this.versionesInsumos.findOneBy({ versionCosteoId: id, insumoId: String(dto.insumoId) });
    if (duplicado) throw new ConflictException('El insumo ya está registrado en esta versión.');
    const cantidad = Number(dto.cantidad);
    const precio = Number(dto.precioUnitarioAplicado ?? insumo.precioUnitario);
    const subtotal = this.redondearMoneda(cantidad * precio);
    let linea!: VersionCosteoInsumo;
    await this.dataSource.transaction(async (manager) => {
      const lineas = manager.getRepository(VersionCosteoInsumo);
      const versiones = manager.getRepository(VersionCosteo);
      const nextId = await lineas.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
      linea = await lineas.save(lineas.create({
        id: nextId?.id ?? '0', versionCosteoId: id, insumoId: String(dto.insumoId), cantidad,
        unidadMedidaAplicada: insumo.unidadMedida, precioUnitarioAplicado: precio, subtotal,
        observacion: dto.observacion?.trim() || null,
      }));
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.CREAR, linea.id, 'Insumo agregado a la versión.', 'version_costeo_insumo');
    return linea;
  }

  async actualizarInsumo(id: string, lineaId: string, dto: UpdateVersionCosteoInsumoDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes modifican insumos.');
    const { version, linea } = await this.lineaInsumoEditable(id, lineaId, usuario);
    let actualizada!: VersionCosteoInsumo;
    await this.dataSource.transaction(async (manager) => {
      const lineas = manager.getRepository(VersionCosteoInsumo);
      const versiones = manager.getRepository(VersionCosteo);
      const actual = await lineas.findOneBy({ id: linea.id });
      if (!actual || actual.versionCosteoId !== id) throw new NotFoundException('Línea de insumo no encontrada.');
      if (dto.cantidad !== undefined) actual.cantidad = Number(dto.cantidad);
      if (dto.precioUnitarioAplicado !== undefined) actual.precioUnitarioAplicado = Number(dto.precioUnitarioAplicado);
      if (dto.observacion !== undefined) actual.observacion = dto.observacion.trim() || null;
      actual.subtotal = this.redondearMoneda(Number(actual.cantidad) * Number(actual.precioUnitarioAplicado));
      actualizada = await lineas.save(actual);
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, actualizada.id, 'Insumo de versión actualizado.', 'version_costeo_insumo');
    return actualizada;
  }

  async retirarInsumo(id: string, lineaId: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes retiran insumos.');
    const { version, linea } = await this.lineaInsumoEditable(id, lineaId, usuario);
    await this.dataSource.transaction(async (manager) => {
      const lineas = manager.getRepository(VersionCosteoInsumo);
      const versiones = manager.getRepository(VersionCosteo);
      const actual = await lineas.findOneBy({ id: linea.id });
      if (!actual || actual.versionCosteoId !== id) throw new NotFoundException('Línea de insumo no encontrada.');
      await lineas.remove(actual);
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, version.id, 'Se retiró un insumo del borrador.');
  }

  private async lineaInsumoEditable(id: string, lineaId: string, usuario: UsuarioAutenticado) {
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const linea = await this.versionesInsumos.findOneBy({ id: lineaId });
    if (!linea || linea.versionCosteoId !== id) throw new NotFoundException('Línea de insumo no encontrada.');
    return { version, linea };
  }


  private async recalcularHiloEnTransaccion(versionId: string, manager: EntityManager): Promise<VersionCosteoCalculoBase> {
    const base = await this.inicializarCalculosBase(versionId, manager);
    const orden = await manager.getRepository(OrdenOperacional).findOneBy({ versionCosteoId: versionId });
    const cantidadHiloMetros = Number(orden?.totalHiloCm ?? 0) / 100;
    const precioPresentacion = Number(base.precioPresentacionHilo);
    const metrosPresentacion = Number(base.metrosPresentacionHilo);
    // precioHiloPorMetro conserva el precio base de la presentación. La hoja de cálculo
    // obtiene el valor unitario con cantidadHiloMetros y luego calcula el costo real.
    const precioBase = precioPresentacion / metrosPresentacion;
    const valorUnitario = precioBase * cantidadHiloMetros;
    base.hiloTotalMetros = this.decimal(cantidadHiloMetros, 6);
    base.precioHiloPorMetro = this.decimal(precioBase, 10);
    base.subtotalHilo = this.decimal(cantidadHiloMetros * valorUnitario, 10);
    base.updatedAt = new Date();
    return manager.getRepository(VersionCosteoCalculoBase).save(base);
  }

  async recalcularMaterialesDesdeOrden(versionId: string, manager: EntityManager) {
    const version = await manager.getRepository(VersionCosteo).findOneBy({ id: versionId });
    if (!version) throw new NotFoundException('Versión no encontrada.');
    return this.recalcularCosteoEnTransaccion(version, manager);
  }

  async materiales(id: string, usuario: UsuarioAutenticado) {
    const version = await this.one(id, usuario);
    await this.dataSource.transaction(manager => this.recalcularCosteoEnTransaccion(version, manager));
    const [telas, insumos, base, actual] = await Promise.all([
      this.telasVersion(id, usuario), this.insumosVersion(id, usuario), this.calculosBase(id, usuario), this.one(id, usuario),
    ]);
    return { telas, insumos, hilo: base.hilo, resumen: { subtotalTelas: Number(actual.subtotalTelas), subtotalInsumos: Number(actual.subtotalInsumos), subtotalHilo: base.hilo.subtotal, subtotalMateriales: Number(actual.subtotalMateriales) } };
  }

  async actualizarUtilidad(id: string, dto: ActualizarUtilidadDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes editan la utilidad.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    await this.dataSource.transaction(async manager => { const base = await this.inicializarCalculosBase(id, manager); base.porcentajeUtilidad = this.decimal(dto.porcentajeUtilidad, 4); await manager.getRepository(VersionCosteoCalculoBase).save(base); await this.recalcularCosteoEnTransaccion(version, manager); });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, id, 'Utilidad de la versión actualizada.', 'version_costeo_calculo_base');
    return this.calculosBase(id, usuario);
  }
  async actualizarHilo(id: string, dto: ActualizarConfiguracionHiloDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes configuran el hilo.');
    const version = await this.one(id, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    await this.dataSource.transaction(async manager => {
      const base = await this.inicializarCalculosBase(id, manager);
      if (dto.precioPresentacionHilo !== undefined) base.precioPresentacionHilo = this.decimal(dto.precioPresentacionHilo, 6);
      if (dto.metrosPresentacionHilo !== undefined) base.metrosPresentacionHilo = this.decimal(dto.metrosPresentacionHilo, 4);
      await manager.getRepository(VersionCosteoCalculoBase).save(base);
      await this.recalcularCosteoEnTransaccion(version, manager);
    });
    await this.audit(usuario.sub, AccionAuditoria.ACTUALIZAR, id, 'Configuración de hilo actualizada.', 'version_costeo_calculo_base');
    return this.materiales(id, usuario);
  }

  private async proximoCodigo(repository: Repository<Tela | Insumo>, prefijo: string): Promise<{ id: string; codigo: string }> {
    const id = await repository.createQueryBuilder('c').select('COALESCE(MAX(c.id),0)+1', 'id').getRawOne<{ id: string }>();
    const codigo = await repository.createQueryBuilder('c').select("COALESCE(MAX(NULLIF(substring(c.codigo from '([0-9]+)$'), '')::integer),0)+1", 'numero').getRawOne<{ numero: string }>();
    return { id: id?.id ?? '1', codigo: `${prefijo}-${String(Number(codigo?.numero ?? 1)).padStart(3, '0')}` };
  }

  async crearTelaDesdeCosteo(versionId: string, dto: CrearTelaDesdeCosteoDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes crean telas desde Costeo.');
    const version = await this.one(versionId, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const nombre = dto.nombre.trim();
    const existente = await this.telas.createQueryBuilder('t').where('lower(t.nombre)=lower(:nombre)', { nombre }).getOne();
    if (existente) throw new ConflictException('Ya existe una tela con ese nombre.');
    try {
      const siguiente = await this.proximoCodigo(this.telas, 'TEL');
      const tela = await this.telas.save(this.telas.create({ id: siguiente.id, codigo: siguiente.codigo, nombre, descripcion: dto.descripcion?.trim() || null, anchoCm: this.decimal(dto.anchoCm, 2), precioMetro: this.decimal(dto.precioMetro, 2), estado: EstadoCatalogo.ACTIVO }));
      await this.audit(usuario.sub, AccionAuditoria.CREAR, tela.id, 'Tela creada desde Costeo.', 'tela');
      return tela;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('La tela ya existe o entra en conflicto con el catálogo.');
      throw error;
    }
  }

  async crearInsumoDesdeCosteo(versionId: string, dto: CrearInsumoDesdeCosteoDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes crean insumos desde Costeo.');
    const version = await this.one(versionId, usuario);
    if (version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    const nombre = dto.nombre.trim();
    const existente = await this.insumos.createQueryBuilder('i').where('lower(i.nombre)=lower(:nombre)', { nombre }).getOne();
    if (existente) throw new ConflictException('Ya existe un insumo con ese nombre.');
    try {
      const siguiente = await this.proximoCodigo(this.insumos, 'INS');
      const insumo = await this.insumos.save(this.insumos.create({ id: siguiente.id, codigo: siguiente.codigo, nombre, descripcion: dto.descripcion?.trim() || null, unidadMedida: dto.unidadMedida.trim().toUpperCase(), precioUnitario: this.decimal(dto.precioUnitario, 2), estado: EstadoCatalogo.ACTIVO }));
      await this.audit(usuario.sub, AccionAuditoria.CREAR, insumo.id, 'Insumo creado desde Costeo.', 'insumo');
      return insumo;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('El insumo ya existe o entra en conflicto con el catálogo.');
      throw error;
    }
  }
  async recalcularCosteo(versionId: string) {
    return this.dataSource.transaction(async (manager) => {
      const version = await manager.getRepository(VersionCosteo).findOneBy({ id: versionId });
      if (!version) throw new NotFoundException('Versión no encontrada.');
      return this.recalcularCosteoEnTransaccion(version, manager);
    });
  }

  private async validarLineasCosteo(versionId: string, manager: EntityManager) {
    const [telasInvalidas, insumosInvalidos] = await Promise.all([
      manager.query('select id from version_costeo_tela where version_costeo_id=$1 and (cantidad_metros <= 0 or precio_metro_aplicado <= 0 or subtotal < 0 or (cantidad_metros_sugerida is not null and cantidad_metros_sugerida <= 0)) limit 1', [versionId]),
      manager.query("select id from version_costeo_insumo where version_costeo_id=$1 and (cantidad <= 0 or btrim(unidad_medida_aplicada)='' or precio_unitario_aplicado <= 0 or subtotal < 0) limit 1", [versionId]),
    ]);
    if (telasInvalidas.length > 0 || insumosInvalidos.length > 0) {
      throw new BadRequestException('La versión contiene líneas de costo inválidas.');
    }
  }
  private async recalcularCosteoEnTransaccion(version: VersionCosteo, manager: EntityManager) {
    const telas = manager.getRepository(VersionCosteoTela);
    const insumos = manager.getRepository(VersionCosteoInsumo);
    const hilo = await this.recalcularHiloEnTransaccion(version.id, manager);
      const operacionesSam = manager.getRepository(VersionCosteoOperacionSam);
    const versiones = manager.getRepository(VersionCosteo);
    const [sumaTelas, sumaInsumos] = await Promise.all([
      telas.createQueryBuilder('vt').select('COALESCE(SUM(vt.subtotal), 0)', 'subtotal')
        .where('vt.version_costeo_id = :id', { id: version.id }).getRawOne<{ subtotal: string }>(),
      insumos.createQueryBuilder('vi').select('COALESCE(SUM(vi.subtotal), 0)', 'subtotal')
        .where('vi.version_costeo_id = :id', { id: version.id }).getRawOne<{ subtotal: string }>(),
    ]);
    const subtotalTelas = this.redondearMoneda(Number(sumaTelas?.subtotal ?? 0));
    const subtotalInsumos = this.redondearMoneda(Number(sumaInsumos?.subtotal ?? 0));
    const subtotalMateriales = this.redondearMoneda(subtotalTelas + subtotalInsumos + Number(hilo.subtotalHilo));
    const valorManoObra = this.redondearMoneda(subtotalMateriales * Number(version.porcentajeManoObra) / 100);
    const baseConManoObra = this.redondearMoneda(subtotalMateriales + valorManoObra);
    const valorGanancia = this.redondearMoneda(baseConManoObra * Number(version.porcentajeGanancia) / 100);
    const totalCosteo = this.redondearMoneda(baseConManoObra + valorGanancia);

    const orden = await manager.getRepository(OrdenOperacional).findOneBy({ versionCosteoId: version.id });
    const final = calcularCostoFinal({
      tiempoEstandar: Number(orden?.tiempoEstandarMinutos ?? 0), costoMinutoMod: Number(hilo.costoMinutoMod),
      costoMinutoMoi: Number(hilo.costoMinutoMoi), costoMinutoGenerales: Number(hilo.costoMinutoGastosGenerales),
      costoMinutoPatronajeCorte: Number(hilo.costoMinutoPatronajeCorte), costoMinutoDiseno: Number(hilo.costoMinutoDiseno),
      subtotalMateriales, porcentajeUtilidad: Number(hilo.porcentajeUtilidad), porcentajeIva: Number(hilo.porcentajeIvaAplicado),
    });
    hilo.tiempoEstandarAplicado = this.decimal(Number(orden?.tiempoEstandarMinutos ?? 0));
    hilo.costoModPrenda = this.decimal(final.mod); hilo.costoMoiPrenda = this.decimal(final.moi); hilo.costoGeneralesPrenda = this.decimal(final.generales);
    hilo.costoPatronajeCortePrenda = this.decimal(final.patronajeCorte); hilo.costoDisenoPrenda = this.decimal(final.diseno); hilo.costoMateriales = this.decimal(final.materiales);
    hilo.costoUnitario = this.decimal(final.costoUnitario); hilo.valorUtilidad = this.decimal(final.utilidad); hilo.subtotalVenta = this.decimal(final.subtotalVenta);
    hilo.valorIva = this.decimal(final.iva); hilo.pvp = this.decimal(final.pvp); hilo.updatedAt = new Date();
    await manager.getRepository(VersionCosteoCalculoBase).save(hilo);    version.subtotalTelas = subtotalTelas.toFixed(2);
    version.subtotalInsumos = subtotalInsumos.toFixed(2);
    version.subtotalMateriales = subtotalMateriales.toFixed(2);
    version.valorManoObra = valorManoObra.toFixed(2);
    version.valorGanancia = valorGanancia.toFixed(2);
    version.totalCosteo = totalCosteo.toFixed(2);
    return versiones.save(version);
  }
  private redondearMoneda(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private async audit(usuarioId: string, accion: AccionAuditoria, entidadId: string, descripcion: string, entidad = 'version_costeo', metadatos: Record<string, unknown> | null = null) {
    const nextId = await this.auditorias.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
    await this.auditorias.save(this.auditorias.create({
      id: nextId?.id ?? '0', usuarioId, modulo: 'COSTEO', accion, entidad, entidadId,
      descripcion, metadatos, direccionIp: null, userAgent: null,
    }));
  }
}






