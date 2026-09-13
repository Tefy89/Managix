import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Maquinaria, OrdenOperacional, OrdenOperacionalDetalle } from './entities/orden-operacional.entities';
import { CreateDetalleOrdenDto, CreateMaquinariaDto, EstadoMaquinariaDto, ReordenarOrdenDto, UpdateDetalleOrdenDto, UpdateMaquinariaDto } from './dto/orden-operacional.dto';
import { EstadoCatalogo } from '../auth/entities/rol.entity';
import { VersionCosteo, EstadoVersionCosteo } from '../costeo/entities/version-costeo.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { Auditoria, AccionAuditoria } from '../administracion/entities/auditoria.entity';
import { CosteoService } from '../costeo/costeo.service';

type Usuario = { sub: string; rol: string };
const cero = { totalSegundos: 0, totalCosturaCm: 0, totalHiloCm: 0, totalHiloMetros: 0, tiempoRealMinutos: 0, tiempoEstandarMinutos: 0 };

@Injectable()
export class OrdenOperacionalService {
  constructor(
    @InjectRepository(Maquinaria) private readonly maquinariaRepo: Repository<Maquinaria>,
    @InjectRepository(OrdenOperacional) private readonly ordenRepo: Repository<OrdenOperacional>,
    @InjectRepository(OrdenOperacionalDetalle) private readonly detalleRepo: Repository<OrdenOperacionalDetalle>,
    @InjectRepository(VersionCosteo) private readonly versionRepo: Repository<VersionCosteo>,
    @InjectRepository(Proyecto) private readonly proyectoRepo: Repository<Proyecto>,
    @InjectRepository(Auditoria) private readonly auditRepo: Repository<Auditoria>,
    private readonly dataSource: DataSource,
    private readonly costeoService: CosteoService,
  ) {}

  private numero(valor: number): string { return Number(valor.toFixed(4)).toFixed(4); }
  private async auditar(usuarioId: string, accion: AccionAuditoria, entidad: string, entidadId: string, descripcion: string) {
    const next = await this.auditRepo.createQueryBuilder('a').select('COALESCE(MAX(a.id),0)+1', 'id').getRawOne<{ id: string }>();
    await this.auditRepo.save(this.auditRepo.create({ id: next?.id ?? '1', usuarioId, modulo: 'ORDEN_OPERACIONAL', accion, entidad, entidadId, descripcion, metadatos: null, direccionIp: null, userAgent: null }));
  }
  private async version(versionId: string, usuario: Usuario, escritura = false) {
    const version = await this.versionRepo.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException('Versión no encontrada.');
    const proyecto = await this.proyectoRepo.findOneBy({ id: version.proyectoId });
    if (usuario.rol === 'ESTUDIANTE' && proyecto?.estudianteId !== usuario.sub) throw new ForbiddenException('No tiene acceso a esta versión.');
    if (escritura && usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo el estudiante propietario puede editar la Orden Operacional.');
    if (escritura && version.estado !== EstadoVersionCosteo.BORRADOR) throw new BadRequestException('Solo versiones BORRADOR son editables.');
    return version;
  }
  private async maquinariaActiva(id: string) {
    const maquinaria = await this.maquinariaRepo.findOneBy({ id });
    if (!maquinaria) throw new NotFoundException('Maquinaria no encontrada.');
    if (maquinaria.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('La maquinaria está inactiva.');
    return maquinaria;
  }
  async listarMaquinaria(filtros: { estado?: EstadoCatalogo; search?: string }) {
    const qb = this.maquinariaRepo.createQueryBuilder('m').orderBy('m.nombre', 'ASC');
    if (filtros.estado) qb.where('m.estado = :estado', { estado: filtros.estado });
    if (filtros.search) qb.andWhere('(m.codigo ILIKE :search OR m.nombre ILIKE :search)', { search: `%${filtros.search}%` });
    return qb.getMany();
  }
  async unaMaquinaria(id: string) { const item = await this.maquinariaRepo.findOneBy({ id }); if (!item) throw new NotFoundException('Maquinaria no encontrada.'); return item; }
  async crearMaquinaria(dto: CreateMaquinariaDto, usuario: Usuario) {
    try { const item = await this.maquinariaRepo.save(this.maquinariaRepo.create({ codigo: dto.codigo.trim().toUpperCase(), nombre: dto.nombre.trim(), factorConsumoHilo: this.numero(dto.factorConsumoHilo), estado: EstadoCatalogo.ACTIVO })); await this.auditar(usuario.sub, AccionAuditoria.CREAR, 'maquinaria', item.id, 'Maquinaria creada.'); return item; }
    catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictException('Código o nombre de maquinaria ya existe.'); throw error; }
  }
  async actualizarMaquinaria(id: string, dto: UpdateMaquinariaDto, usuario: Usuario) {
    const item = await this.unaMaquinaria(id); try { if (dto.codigo !== undefined) item.codigo = dto.codigo.trim().toUpperCase(); if (dto.nombre !== undefined) item.nombre = dto.nombre.trim(); if (dto.factorConsumoHilo !== undefined) item.factorConsumoHilo = this.numero(dto.factorConsumoHilo); const saved = await this.maquinariaRepo.save(item); await this.auditar(usuario.sub, AccionAuditoria.ACTUALIZAR, 'maquinaria', id, 'Maquinaria actualizada.'); return saved; }
    catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictException('Código o nombre de maquinaria ya existe.'); throw error; }
  }
  async estadoMaquinaria(id: string, dto: EstadoMaquinariaDto, usuario: Usuario) { const item = await this.unaMaquinaria(id); item.estado = dto.estado; const saved = await this.maquinariaRepo.save(item); await this.auditar(usuario.sub, dto.estado === EstadoCatalogo.INACTIVO ? AccionAuditoria.DESACTIVAR : AccionAuditoria.ACTUALIZAR, 'maquinaria', id, 'Estado de maquinaria actualizado.'); return saved; }

  private async obtenerOCrear(versionId: string, manager: EntityManager) {
    const repo = manager.getRepository(OrdenOperacional); const actual = await repo.findOneBy({ versionCosteoId: versionId });
    if (actual) return actual; const parametros=await manager.query("SELECT codigo,valor::text AS valor FROM configuracion_parametro_costeo WHERE codigo IN ('ERROR_CRONOMETRAJE','CAPACIDAD_PRODUCCION','SUPLEMENTOS')") as Array<{codigo:string;valor:string}>; const g=(c:string,d:number)=>Number(parametros.find(x=>x.codigo===c)?.valor??d); return repo.save(repo.create({ versionCosteoId: versionId, totalSegundos: '0', totalCosturaCm: '0', totalHiloCm: '0', totalHiloMetros: '0', tiempoRealMinutos: '0', tiempoEstandarMinutos: '0', porcentajeErrorCronometraje:String(g('ERROR_CRONOMETRAJE',5)), porcentajeCapacidad:String(g('CAPACIDAD_PRODUCCION',80)), porcentajeSuplementos:String(g('SUPLEMENTOS',11)) }));
  }
  private async recalcular(orden: OrdenOperacional, manager: EntityManager) {
    const detalles = await manager.getRepository(OrdenOperacionalDetalle).find({ where: { ordenOperacionalId: orden.id } });
    const totalSegundos = detalles.reduce((s, d) => s + Number(d.tiempoSegundos), 0);
    const totalCosturaCm = detalles.reduce((s, d) => s + Number(d.costuraCm), 0);
    const totalHiloCm = detalles.reduce((s, d) => s + Number(d.cantidadHiloCm), 0);
    const tiempoReal = totalSegundos / 60;
    orden.totalSegundos = this.numero(totalSegundos); orden.totalCosturaCm = this.numero(totalCosturaCm); orden.totalHiloCm = this.numero(totalHiloCm); orden.totalHiloMetros = this.numero(totalHiloCm / 100); orden.tiempoRealMinutos = this.numero(tiempoReal); const error=Number(orden.porcentajeErrorCronometraje??5)/100, capacidad=Number(orden.porcentajeCapacidad??80)/100, suplementos=Number(orden.porcentajeSuplementos??11)/100; orden.tiempoEstandarMinutos = this.numero((tiempoReal * (1+error) / capacidad) * (1+suplementos));
    return manager.getRepository(OrdenOperacional).save(orden);
  }
  private salida(orden: OrdenOperacional | null, detalles: OrdenOperacionalDetalle[]) {
    return { orden: orden ? { id: orden.id, versionCosteoId: orden.versionCosteoId, totalSegundos: Number(orden.totalSegundos), totalCosturaCm: Number(orden.totalCosturaCm), totalHiloCm: Number(orden.totalHiloCm), totalHiloMetros: Number(orden.totalHiloMetros), tiempoRealMinutos: Number(orden.tiempoRealMinutos), tiempoEstandarMinutos: Number(orden.tiempoEstandarMinutos), tiempoConErrorMinutos: Number(orden.tiempoRealMinutos) * 1.05, tiempoConCapacidadMinutos: Number(orden.tiempoRealMinutos) * 1.05 / .8, suplementosMinutos: Number(orden.tiempoRealMinutos) * 1.05 / .8 * .11 } : cero, detalles: detalles.map(d => ({ id: d.id, ordenVisualizacion: d.ordenVisualizacion, operacion: d.operacion, descripcion: d.descripcion, maquinariaId: d.maquinariaId, maquinariaNombreAplicada: d.maquinariaNombreAplicada, factorHiloAplicado: Number(d.factorHiloAplicado), tiempoSegundos: Number(d.tiempoSegundos), costuraCm: Number(d.costuraCm), cantidadHiloCm: Number(d.cantidadHiloCm) })) };
  }
  async obtener(versionId: string, usuario: Usuario) { await this.version(versionId, usuario); const orden = await this.ordenRepo.findOneBy({ versionCosteoId: versionId }); const detalles = orden ? await this.detalleRepo.find({ where: { ordenOperacionalId: orden.id }, order: { ordenVisualizacion: 'ASC' } }) : []; return this.salida(orden, detalles); }
  async agregarDetalle(versionId: string, dto: CreateDetalleOrdenDto, usuario: Usuario) {
    await this.version(versionId, usuario, true); const maquina = await this.maquinariaActiva(String(dto.maquinariaId)); let creado!: OrdenOperacionalDetalle;
    await this.dataSource.transaction(async manager => { const orden = await this.obtenerOCrear(versionId, manager); const ultimo = await manager.getRepository(OrdenOperacionalDetalle).createQueryBuilder('d').select('COALESCE(MAX(d.orden_visualizacion),0)', 'n').where('d.orden_operacional_id=:id', { id: orden.id }).getRawOne<{ n: string }>(); const hilo = dto.costuraCm * Number(maquina.factorConsumoHilo); creado = await manager.getRepository(OrdenOperacionalDetalle).save(manager.getRepository(OrdenOperacionalDetalle).create({ ordenOperacionalId: orden.id, ordenVisualizacion: Number(ultimo?.n ?? 0) + 1, operacion: dto.operacion.trim(), descripcion: dto.descripcion?.trim() || null, maquinariaId: maquina.id, maquinariaNombreAplicada: maquina.nombre, factorHiloAplicado: maquina.factorConsumoHilo, tiempoSegundos: this.numero(dto.tiempoSegundos), costuraCm: this.numero(dto.costuraCm), cantidadHiloCm: this.numero(hilo) })); await this.recalcular(orden, manager); await this.costeoService.recalcularMaterialesDesdeOrden(versionId, manager); });
    await this.auditar(usuario.sub, AccionAuditoria.CREAR, 'orden_operacional_detalle', creado.id, 'Fila de Orden Operacional creada.'); return creado;
  }
  async actualizarDetalle(versionId: string, detalleId: string, dto: UpdateDetalleOrdenDto, usuario: Usuario) {
    await this.version(versionId, usuario, true); let actualizado!: OrdenOperacionalDetalle;
    await this.dataSource.transaction(async manager => { const detalle = await manager.getRepository(OrdenOperacionalDetalle).findOneBy({ id: detalleId }); if (!detalle) throw new NotFoundException('Fila operacional no encontrada.'); const orden = await manager.getRepository(OrdenOperacional).findOneBy({ id: detalle.ordenOperacionalId, versionCosteoId: versionId }); if (!orden) throw new NotFoundException('Orden Operacional no encontrada.'); if (dto.maquinariaId !== undefined) { const maquina = await manager.getRepository(Maquinaria).findOneBy({ id: String(dto.maquinariaId) }); if (!maquina) throw new NotFoundException('Maquinaria no encontrada.'); if (maquina.estado !== EstadoCatalogo.ACTIVO) throw new BadRequestException('La maquinaria está inactiva.'); detalle.maquinariaId = maquina.id; detalle.maquinariaNombreAplicada = maquina.nombre; detalle.factorHiloAplicado = maquina.factorConsumoHilo; } if (dto.operacion !== undefined) detalle.operacion = dto.operacion.trim(); if (dto.descripcion !== undefined) detalle.descripcion = dto.descripcion.trim() || null; if (dto.tiempoSegundos !== undefined) detalle.tiempoSegundos = this.numero(dto.tiempoSegundos); if (dto.costuraCm !== undefined) detalle.costuraCm = this.numero(dto.costuraCm); detalle.cantidadHiloCm = this.numero(Number(detalle.costuraCm) * Number(detalle.factorHiloAplicado)); actualizado = await manager.getRepository(OrdenOperacionalDetalle).save(detalle); await this.recalcular(orden, manager); await this.costeoService.recalcularMaterialesDesdeOrden(versionId, manager); });
    await this.auditar(usuario.sub, AccionAuditoria.ACTUALIZAR, 'orden_operacional_detalle', detalleId, 'Fila de Orden Operacional actualizada.'); return actualizado;
  }
  async retirarDetalle(versionId: string, detalleId: string, usuario: Usuario) { await this.version(versionId, usuario, true); await this.dataSource.transaction(async manager => { const detalle = await manager.getRepository(OrdenOperacionalDetalle).findOneBy({ id: detalleId }); if (!detalle) throw new NotFoundException('Fila operacional no encontrada.'); const orden = await manager.getRepository(OrdenOperacional).findOneBy({ id: detalle.ordenOperacionalId, versionCosteoId: versionId }); if (!orden) throw new NotFoundException('Orden Operacional no encontrada.'); await manager.getRepository(OrdenOperacionalDetalle).remove(detalle); await this.recalcular(orden, manager); await this.costeoService.recalcularMaterialesDesdeOrden(versionId, manager); }); await this.auditar(usuario.sub, AccionAuditoria.ACTUALIZAR, 'orden_operacional_detalle', detalleId, 'Fila de Orden Operacional eliminada.'); return { ok: true }; }
  async reordenar(versionId: string, dto: ReordenarOrdenDto, usuario: Usuario) { await this.version(versionId, usuario, true); if (new Set(dto.detalles.map(d => d.id)).size !== dto.detalles.length || new Set(dto.detalles.map(d => d.ordenVisualizacion)).size !== dto.detalles.length) throw new BadRequestException('La lista de orden contiene duplicados.'); await this.dataSource.transaction(async manager => { const orden = await manager.getRepository(OrdenOperacional).findOneBy({ versionCosteoId: versionId }); if (!orden) throw new NotFoundException('Orden Operacional no encontrada.'); const actuales = await manager.getRepository(OrdenOperacionalDetalle).findBy({ ordenOperacionalId: orden.id }); if (actuales.length !== dto.detalles.length || dto.detalles.some(item => !actuales.some(actual => actual.id === String(item.id)))) throw new BadRequestException('Debe reordenar exactamente las filas de la Orden Operacional.'); for (const item of dto.detalles) { const actual = actuales.find(d => d.id === String(item.id)); if (actual) { actual.ordenVisualizacion = item.ordenVisualizacion + 10000; await manager.getRepository(OrdenOperacionalDetalle).save(actual); } } for (const item of dto.detalles) { const actual = await manager.getRepository(OrdenOperacionalDetalle).findOneByOrFail({ id: String(item.id) }); actual.ordenVisualizacion = item.ordenVisualizacion; await manager.getRepository(OrdenOperacionalDetalle).save(actual); } }); await this.auditar(usuario.sub, AccionAuditoria.ACTUALIZAR, 'orden_operacional', versionId, 'Orden Operacional reordenada.'); return this.obtener(versionId, usuario); }
  async clonarDesdeVersion(origenVersionId: string, nuevaVersionId: string, manager: EntityManager) { const origen = await manager.getRepository(OrdenOperacional).findOneBy({ versionCosteoId: origenVersionId }); if (!origen) return; const nueva = await manager.getRepository(OrdenOperacional).save(manager.getRepository(OrdenOperacional).create({ versionCosteoId: nuevaVersionId, totalSegundos: origen.totalSegundos, totalCosturaCm: origen.totalCosturaCm, totalHiloCm: origen.totalHiloCm, totalHiloMetros: origen.totalHiloMetros, tiempoRealMinutos: origen.tiempoRealMinutos, tiempoEstandarMinutos: origen.tiempoEstandarMinutos, porcentajeErrorCronometraje:origen.porcentajeErrorCronometraje, porcentajeCapacidad:origen.porcentajeCapacidad, porcentajeSuplementos:origen.porcentajeSuplementos })); const detalles = await manager.getRepository(OrdenOperacionalDetalle).find({ where: { ordenOperacionalId: origen.id } }); for (const d of detalles) await manager.getRepository(OrdenOperacionalDetalle).save(manager.getRepository(OrdenOperacionalDetalle).create({ ordenOperacionalId: nueva.id, ordenVisualizacion: d.ordenVisualizacion, operacion: d.operacion, descripcion: d.descripcion, maquinariaId: d.maquinariaId, maquinariaNombreAplicada: d.maquinariaNombreAplicada, factorHiloAplicado: d.factorHiloAplicado, tiempoSegundos: d.tiempoSegundos, costuraCm: d.costuraCm, cantidadHiloCm: d.cantidadHiloCm })); }
}