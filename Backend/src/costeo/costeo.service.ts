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
import { VersionCosteoMedida } from './entities/version-costeo-medida.entity';
import { VersionCosteoInsumo } from './entities/version-costeo-insumo.entity';
import { VersionCosteoTela } from './entities/version-costeo-tela.entity';
import { VersionCosteoOperacionSam } from '../sam/entities/sam.entities';
import { EstadoVersionCosteo, VersionCosteo } from './entities/version-costeo.entity';

type UsuarioAutenticado = { sub: string; rol: string };

@Injectable()
export class CosteoService {
  constructor(
    @InjectRepository(VersionCosteo) private readonly versiones: Repository<VersionCosteo>,
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

  async list(projectId: string, usuario: UsuarioAutenticado) {
    await this.project(projectId, usuario);
    return this.versiones.find({ where: { proyectoId: projectId }, order: { numeroVersion: 'ASC' } });
  }

  async one(id: string, usuario: UsuarioAutenticado) {
    const version = await this.versiones.findOneBy({ id });
    if (!version) throw new NotFoundException('Versión no encontrada.');
    await this.project(version.proyectoId, usuario);
    return version;
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
    });
    await this.audit(usuario.sub, AccionAuditoria.CREAR, nueva.id, `Nueva versión creada a partir de la versión ${id}.`, 'version_costeo', {
      version_padre_id: id,
      numero_version: nueva.numeroVersion,
    });
    return nueva;
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
      'select vt.id,vt.tela_id,t.codigo,t.nombre,vt.cantidad_metros_sugerida,vt.cantidad_metros,vt.precio_metro_aplicado,vt.subtotal,vt.regla_consumo_tela_id,vt.observacion,vt.created_at,vt.updated_at from version_costeo_tela vt join tela t on t.id=vt.tela_id where vt.version_costeo_id=$1 order by vt.id asc,vt.created_at asc',
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
    const precio = Number(tela.precioMetro);
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
    const precio = Number(insumo.precioUnitario);
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
    const subtotalMateriales = this.redondearMoneda(subtotalTelas + subtotalInsumos);
    const valorManoObra = this.redondearMoneda(subtotalMateriales * Number(version.porcentajeManoObra) / 100);
    const baseConManoObra = this.redondearMoneda(subtotalMateriales + valorManoObra);
    const valorGanancia = this.redondearMoneda(baseConManoObra * Number(version.porcentajeGanancia) / 100);
    const totalCosteo = this.redondearMoneda(baseConManoObra + valorGanancia);

    version.subtotalTelas = subtotalTelas.toFixed(2);
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






