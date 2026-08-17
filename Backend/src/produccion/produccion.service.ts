import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Auditoria, AccionAuditoria } from '../administracion/entities/auditoria.entity';
import { VersionCosteo, EstadoVersionCosteo } from '../costeo/entities/version-costeo.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { CreateOrdenProduccionDto, ListOrdenesProduccionDto } from './dto/orden-produccion.dto';
import { EstadoOrdenProduccion, OrdenProduccion } from './entities/orden-produccion.entity';
import { EtapaProduccion, EstadoOrdenProduccionEtapa, OrdenProduccionEtapa } from './entities/orden-produccion-etapa.entity';
import { UpdateObservacionEtapaDto } from './dto/orden-produccion-etapa.dto';
import { UploadEvidenciaDto } from './dto/evidencia-etapa.dto';
import { EvidenciaEtapa } from './entities/evidencia-etapa.entity';
import { RevisionEtapa, ResultadoRevision } from './entities/revision-etapa.entity';
import { CreateRevisionEtapaDto, ListRevisionEtapasDto } from './dto/revision-etapa.dto';
import { Notificacion, TipoNotificacion } from '../notificaciones/entities/notificacion.entity';

type UsuarioAutenticado = { sub: string; rol: string };
type ArchivoEvidencia = { originalname: string; mimetype: string; size: number; buffer: Buffer };
@Injectable()
export class ProduccionService {
  constructor(
    @InjectRepository(OrdenProduccion) private readonly ordenes: Repository<OrdenProduccion>,
    @InjectRepository(VersionCosteo) private readonly versiones: Repository<VersionCosteo>,
    @InjectRepository(Proyecto) private readonly proyectos: Repository<Proyecto>,
    @InjectRepository(Auditoria) private readonly auditorias: Repository<Auditoria>,
    @InjectRepository(EtapaProduccion) private readonly etapasCatalogo: Repository<EtapaProduccion>,
    @InjectRepository(OrdenProduccionEtapa) private readonly etapasOrden: Repository<OrdenProduccionEtapa>,
    @InjectRepository(EvidenciaEtapa) private readonly evidencias: Repository<EvidenciaEtapa>,
    @InjectRepository(RevisionEtapa) private readonly revisiones: Repository<RevisionEtapa>,
    @InjectRepository(Notificacion) private readonly notificaciones: Repository<Notificacion>,
    private readonly dataSource: DataSource,
  ) {}

  async create(versionId: string, dto: CreateOrdenProduccionDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes pueden crear órdenes de producción.');
    const version = await this.versionAccesible(versionId, usuario);
    if (version.estado !== EstadoVersionCosteo.FINALIZADA) throw new BadRequestException('Solo se puede crear una orden desde una versión FINALIZADA.');
    if (await this.ordenes.findOneBy({ versionCosteoId: versionId })) throw new ConflictException('La versión ya tiene una orden de producción.');
    let orden!: OrdenProduccion;
    try {
      await this.dataSource.transaction(async manager => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [906001]);
        const repositorio = manager.getRepository(OrdenProduccion);
        if (await repositorio.findOneBy({ versionCosteoId: versionId })) throw new ConflictException('La versión ya tiene una orden de producción.');
        const actual = await manager.getRepository(VersionCosteo).findOneBy({ id: versionId });
        if (!actual) throw new NotFoundException('Versión de costeo no encontrada.');
        if (actual.estado !== EstadoVersionCosteo.FINALIZADA) throw new BadRequestException('Solo se puede crear una orden desde una versión FINALIZADA.');
        const codigo = await this.siguienteCodigo(manager);
        const siguienteId = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
        orden = await repositorio.save(repositorio.create({ id: siguienteId?.id ?? '0', versionCosteoId: versionId, codigo, estado: EstadoOrdenProduccion.PENDIENTE, fechaInicio: null, fechaFin: null, observacion: dto.observacion?.trim() || null }));
        await this.auditar(manager, usuario.sub, orden.id, orden.codigo);
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('La versión ya tiene una orden de producción.');
      throw error;
    }
    return this.one(orden.id, usuario);
  }

  async list(filters: ListOrdenesProduccionDto, usuario: UsuarioAutenticado) {
    const params: unknown[] = []; const where: string[] = [];
    if (usuario.rol === 'ESTUDIANTE') { params.push(usuario.sub); where.push(`p.estudiante_id=$${params.length}`); }
    if (filters.estado) { params.push(filters.estado); where.push(`o.estado=$${params.length}`); }
    if (filters.proyecto) { params.push(filters.proyecto); where.push(`p.id=$${params.length}`); }
    if (filters.search?.trim()) { params.push(`%${filters.search.trim()}%`); where.push(`(o.codigo ILIKE $${params.length} OR p.nombre ILIKE $${params.length} OR v.nombre ILIKE $${params.length})`); }
    const sql = `${this.detalleSelect()} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY o.created_at DESC, o.id DESC`;
    return this.ordenes.manager.query(sql, params);
  }

  async one(id: string, usuario: UsuarioAutenticado) {
    const rows = await this.ordenes.manager.query(`${this.detalleSelect()} WHERE o.id=$1`, [id]);
    const orden = rows[0];
    if (!orden) throw new NotFoundException('Orden de producción no encontrada.');
    if (usuario.rol === 'ESTUDIANTE' && String(orden.estudiante_id) !== String(usuario.sub)) throw new ForbiddenException('No tiene acceso a esta orden de producción.');
    return orden;
  }

  async byVersion(versionId: string, usuario: UsuarioAutenticado) {
    await this.versionAccesible(versionId, usuario);
    const orden = await this.ordenes.findOneBy({ versionCosteoId: versionId });
    if (!orden) throw new NotFoundException('La versión no tiene una orden de producción.');
    return this.one(orden.id, usuario);
  }

  async iniciar(id: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes pueden iniciar órdenes de producción.');
    await this.ordenAccesible(id, usuario);
    let iniciada!: OrdenProduccion;
    await this.dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [906002]);
      const ordenes = manager.getRepository(OrdenProduccion);
      const lineas = manager.getRepository(OrdenProduccionEtapa);
      const catalogo = manager.getRepository(EtapaProduccion);
      const orden = await ordenes.findOneBy({ id });
      if (!orden) throw new NotFoundException('Orden de producción no encontrada.');
      if (orden.estado !== EstadoOrdenProduccion.PENDIENTE) throw new BadRequestException('Solo órdenes PENDIENTE pueden iniciarse.');
      const existentes = await lineas.countBy({ ordenProduccionId: id });
      if (existentes > 0) throw new ConflictException('La orden ya tiene etapas preparadas.');
      const etapas = await catalogo.find({ where: { estado: 'ACTIVO' }, order: { orden: 'ASC' } });
      if (!etapas.length) throw new BadRequestException('No existen etapas activas para iniciar la orden.');
      const siguiente = await lineas.createQueryBuilder().select('COALESCE(MAX(id),0)', 'id').getRawOne<{ id: string }>();
      let siguienteId = Number(siguiente?.id ?? 0); const ahora = new Date();
      for (const [indice, etapa] of etapas.entries()) {
        siguienteId += 1;
        await lineas.save(lineas.create({ id: String(siguienteId), ordenProduccionId: id, etapaProduccionId: etapa.id, codigoEtapaAplicado: etapa.codigo, nombreEtapaAplicado: etapa.nombre, ordenAplicado: etapa.orden, estado: indice === 0 ? EstadoOrdenProduccionEtapa.EN_PROCESO : EstadoOrdenProduccionEtapa.PENDIENTE, fechaInicio: indice === 0 ? ahora : null, fechaFin: null, observacionEstudiante: null }));
      }
      orden.estado = EstadoOrdenProduccion.EN_PROCESO; orden.fechaInicio = ahora; orden.fechaFin = null;
      iniciada = await ordenes.save(orden);
      await this.auditarActualizacion(manager, usuario.sub, id, 'orden_produccion', 'Orden de producción iniciada.');
      await this.crearNotificacion(manager, usuario.sub, 'Producción iniciada', 'Se inició la orden de producción ' + orden.codigo + '.', TipoNotificacion.ORDEN_PRODUCCION, 'ORDEN_PRODUCCION', orden.id);
    });
    return this.one(iniciada.id, usuario);
  }

  async etapas(id: string, usuario: UsuarioAutenticado) { await this.ordenAccesible(id, usuario); const etapas = await this.etapasOrden.find({ where: { ordenProduccionId: id }, order: { ordenAplicado: 'ASC' } }); return etapas.map(etapa => this.respuestaEtapa(etapa)); }
  async etapa(id: string, etapaId: string, usuario: UsuarioAutenticado) { await this.ordenAccesible(id, usuario); const etapa = await this.etapasOrden.findOneBy({ id: etapaId, ordenProduccionId: id }); if (!etapa) throw new NotFoundException('Etapa de producción no encontrada.'); return this.respuestaEtapa(etapa); }
  async actualizarObservacion(id: string, etapaId: string, dto: UpdateObservacionEtapaDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes pueden actualizar observaciones de etapas.');
    await this.ordenAccesible(id, usuario);
    const etapa = await this.etapasOrden.findOneBy({ id: etapaId, ordenProduccionId: id });
    if (!etapa) throw new NotFoundException('Etapa de producción no encontrada.');
    if (![EstadoOrdenProduccionEtapa.EN_PROCESO, EstadoOrdenProduccionEtapa.OBSERVADA].includes(etapa.estado)) throw new BadRequestException('La etapa no permite observaciones del estudiante en su estado actual.');
    etapa.observacionEstudiante = dto.observacionEstudiante.trim() || null;
    const actualizada = await this.etapasOrden.save(etapa);
    await this.dataSource.transaction(manager => this.auditarActualizacion(manager, usuario.sub, etapa.id, 'orden_produccion_etapa', 'Observación de etapa actualizada.'));
    return this.respuestaEtapa(actualizada);
  }
  async obtenerEtapaActual(ordenId: string): Promise<OrdenProduccionEtapa | null> {
    const enProceso = await this.etapasOrden.findOne({ where: { ordenProduccionId: ordenId, estado: EstadoOrdenProduccionEtapa.EN_PROCESO }, order: { ordenAplicado: 'ASC' } });
    if (enProceso) return enProceso;
    return this.etapasOrden.createQueryBuilder('etapa')
      .where('etapa.orden_produccion_id = :ordenId', { ordenId })
      .andWhere('etapa.estado = :pendiente', { pendiente: EstadoOrdenProduccionEtapa.PENDIENTE })
      .andWhere(`NOT EXISTS (SELECT 1 FROM orden_produccion_etapa previa WHERE previa.orden_produccion_id = etapa.orden_produccion_id AND previa.orden_aplicado < etapa.orden_aplicado AND previa.estado <> :completada)`, { completada: EstadoOrdenProduccionEtapa.COMPLETADA })
      .orderBy('etapa.orden_aplicado', 'ASC').getOne();
  }
  private async ordenAccesible(id: string, usuario: UsuarioAutenticado): Promise<OrdenProduccion> { const orden = await this.ordenes.findOneBy({ id }); if (!orden) throw new NotFoundException('Orden de producción no encontrada.'); await this.versionAccesible(orden.versionCosteoId, usuario); return orden; }
  private respuestaEtapa(etapa: OrdenProduccionEtapa) { return { id: etapa.id, etapa_produccion_id: etapa.etapaProduccionId, codigo: etapa.codigoEtapaAplicado, nombre: etapa.nombreEtapaAplicado, orden: etapa.ordenAplicado, estado: etapa.estado, fecha_inicio: etapa.fechaInicio, fecha_fin: etapa.fechaFin, observacion_estudiante: etapa.observacionEstudiante, created_at: etapa.createdAt, updated_at: etapa.updatedAt }; }
  private async auditarActualizacion(manager: EntityManager, usuarioId: string, entidadId: string, entidad: string, descripcion: string): Promise<void> { const repositorio = manager.getRepository(Auditoria); const siguienteId = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>(); await repositorio.save(repositorio.create({ id: siguienteId?.id ?? '0', usuarioId, modulo: 'PRODUCCION', accion: AccionAuditoria.ACTUALIZAR, entidad, entidadId, descripcion, metadatos: null, direccionIp: null, userAgent: null })); }
  async evidenciasEtapa(ordenId: string, etapaId: string, usuario: UsuarioAutenticado) {
    await this.etapa(ordenId, etapaId, usuario);
    const evidencias = await this.evidencias.find({ where: { ordenProduccionEtapaId: etapaId }, relations: { subidoPor: true }, order: { createdAt: 'ASC' } });
    return evidencias.map(evidencia => this.respuestaEvidencia(evidencia));
  }

  async subirEvidencia(ordenId: string, etapaId: string, dto: UploadEvidenciaDto, archivo: ArchivoEvidencia | undefined, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes pueden subir evidencias.');
    const etapa = await this.etapaEditableParaEvidencia(ordenId, etapaId, usuario);
    if (!archivo) throw new BadRequestException('Debe adjuntar una imagen.');
    const permitidos = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!permitidos.has(archivo.mimetype)) throw new BadRequestException('Solo se permiten imágenes JPEG, PNG o WEBP.');
    if (archivo.size <= 0 || archivo.size > 5 * 1024 * 1024) throw new BadRequestException('La imagen supera el límite de 5 MB.');
    const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[archivo.mimetype]!;
    const storageKey = join('produccion', ordenId, etapaId, `${randomUUID()}${extension}`).replaceAll('\\', '/');
    const ruta = join(process.cwd(), 'uploads', 'evidencias', storageKey);
    await fs.mkdir(join(process.cwd(), 'uploads', 'evidencias', 'produccion', ordenId, etapaId), { recursive: true });
    await fs.writeFile(ruta, archivo.buffer);
    try {
      const siguiente = await this.evidencias.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
      const evidencia = await this.evidencias.save(this.evidencias.create({ id: siguiente?.id ?? '0', ordenProduccionEtapaId: etapa.id, subidoPorUsuarioId: usuario.sub, nombreOriginalArchivo: this.nombreSeguro(archivo.originalname), storageKey, mimeType: archivo.mimetype, tamanoBytes: String(archivo.size), descripcion: dto.descripcion?.trim() || null }));
      await this.dataSource.transaction(manager => this.auditarCreacion(manager, usuario.sub, evidencia.id, 'evidencia_etapa', 'Evidencia de etapa subida.'));
      return this.respuestaEvidencia(evidencia);
    } catch (error) { await fs.unlink(ruta).catch(() => undefined); throw error; }
  }

  async eliminarEvidencia(ordenId: string, etapaId: string, evidenciaId: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes pueden eliminar evidencias.');
    const etapa = await this.etapaEditableParaEvidencia(ordenId, etapaId, usuario);
    if (etapa.estado !== EstadoOrdenProduccionEtapa.EN_PROCESO) throw new BadRequestException('Solo se eliminan evidencias de etapas EN_PROCESO.');
    const evidencia = await this.evidencias.findOneBy({ id: evidenciaId, ordenProduccionEtapaId: etapaId });
    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');
    if (evidencia.subidoPorUsuarioId !== usuario.sub) throw new ForbiddenException('Solo puede eliminar evidencias propias.');
    await this.evidencias.remove(evidencia);
    await fs.unlink(this.rutaFisica(evidencia.storageKey)).catch(() => undefined);
    await this.dataSource.transaction(manager => this.auditarActualizacion(manager, usuario.sub, etapa.id, 'orden_produccion_etapa', 'Evidencia de etapa eliminada.'));
  }

  async archivoEvidencia(evidenciaId: string, usuario: UsuarioAutenticado): Promise<{ evidencia: EvidenciaEtapa; ruta: string }> {
    const evidencia = await this.evidencias.findOneBy({ id: evidenciaId });
    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');
    const etapa = await this.etapasOrden.findOneBy({ id: evidencia.ordenProduccionEtapaId });
    if (!etapa) throw new NotFoundException('Etapa de producción no encontrada.');
    await this.ordenAccesible(etapa.ordenProduccionId, usuario);
    const ruta = this.rutaFisica(evidencia.storageKey);
    try { await fs.access(ruta); } catch { throw new NotFoundException('Archivo de evidencia no disponible.'); }
    return { evidencia, ruta };
  }

  async completarEtapa(ordenId: string, etapaId: string, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'ESTUDIANTE') throw new ForbiddenException('Solo estudiantes pueden completar etapas.');
    await this.ordenAccesible(ordenId, usuario);
    let resultado!: OrdenProduccionEtapa;
    await this.dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [906003]);
      const ordenes = manager.getRepository(OrdenProduccion); const etapas = manager.getRepository(OrdenProduccionEtapa); const evidencias = manager.getRepository(EvidenciaEtapa);
      const orden = await ordenes.findOneBy({ id: ordenId }); if (!orden) throw new NotFoundException('Orden de producción no encontrada.');
      if (orden.estado !== EstadoOrdenProduccion.EN_PROCESO) throw new BadRequestException('La orden debe estar EN_PROCESO.');
      const etapa = await etapas.findOneBy({ id: etapaId, ordenProduccionId: ordenId }); if (!etapa) throw new NotFoundException('Etapa de producción no encontrada.');
      if (etapa.estado !== EstadoOrdenProduccionEtapa.EN_PROCESO) throw new BadRequestException('Solo la etapa EN_PROCESO puede completarse.');
      const actual = await etapas.createQueryBuilder('etapa').where('etapa.orden_produccion_id=:ordenId', { ordenId }).andWhere('etapa.estado=:estado', { estado: EstadoOrdenProduccionEtapa.EN_PROCESO }).orderBy('etapa.orden_aplicado', 'ASC').getOne();
      if (!actual || actual.id !== etapaId) throw new BadRequestException('No se puede completar una etapa fuera de secuencia.');
      if (await evidencias.countBy({ ordenProduccionEtapaId: etapaId }) < 1) throw new BadRequestException('Debe registrar al menos una evidencia fotográfica para completar la etapa.');
      const ahora = new Date(); etapa.estado = EstadoOrdenProduccionEtapa.COMPLETADA; etapa.fechaFin = ahora; resultado = await etapas.save(etapa);
      const siguiente = await etapas.createQueryBuilder('etapa').where('etapa.orden_produccion_id=:ordenId', { ordenId }).andWhere('etapa.orden_aplicado > :orden', { orden: etapa.ordenAplicado }).orderBy('etapa.orden_aplicado', 'ASC').getOne();
      if (siguiente) { if (siguiente.estado !== EstadoOrdenProduccionEtapa.PENDIENTE) throw new BadRequestException('La siguiente etapa no está disponible.'); siguiente.estado = EstadoOrdenProduccionEtapa.EN_PROCESO; siguiente.fechaInicio = ahora; await etapas.save(siguiente); }
      else { orden.estado = EstadoOrdenProduccion.FINALIZADA; orden.fechaFin = ahora; await ordenes.save(orden); await this.auditarActualizacion(manager, usuario.sub, orden.id, 'orden_produccion', 'Orden de producción finalizada.');
        await this.crearNotificacion(manager, usuario.sub, 'Producción finalizada', 'Se finalizó la orden de producción ' + orden.codigo + '.', TipoNotificacion.ORDEN_PRODUCCION, 'ORDEN_PRODUCCION', orden.id); }
      await this.auditarActualizacion(manager, usuario.sub, etapa.id, 'orden_produccion_etapa', 'Etapa completada por el estudiante.');
    });
    return this.respuestaEtapa(resultado);
  }

  private async etapaEditableParaEvidencia(ordenId: string, etapaId: string, usuario: UsuarioAutenticado): Promise<OrdenProduccionEtapa> {
    const etapa = await this.etapa(ordenId, etapaId, usuario) as { id: string; estado: EstadoOrdenProduccionEtapa };
    if (![EstadoOrdenProduccionEtapa.EN_PROCESO, EstadoOrdenProduccionEtapa.OBSERVADA].includes(etapa.estado)) throw new BadRequestException('La etapa no permite evidencias en su estado actual.');
    const entidad = await this.etapasOrden.findOneBy({ id: etapa.id, ordenProduccionId: ordenId }); if (!entidad) throw new NotFoundException('Etapa de producción no encontrada.'); return entidad;
  }
  private respuestaEvidencia(evidencia: EvidenciaEtapa) { return { id: evidencia.id, nombre_original_archivo: evidencia.nombreOriginalArchivo, storage_key: evidencia.storageKey, mime_type: evidencia.mimeType, tamano_bytes: evidencia.tamanoBytes, descripcion: evidencia.descripcion, usuario: evidencia.subidoPor ? { id: evidencia.subidoPor.id, nombre: evidencia.subidoPor.nombre, apellido: evidencia.subidoPor.apellido } : undefined, created_at: evidencia.createdAt }; }
  private rutaFisica(storageKey: string): string { return join(process.cwd(), 'uploads', 'evidencias', storageKey); }
  private nombreSeguro(nombre: string): string { const base = nombre.replace(/[\\/]/g, '').trim(); return base || `evidencia${extname(nombre) || '.img'}`; }
  private async auditarCreacion(manager: EntityManager, usuarioId: string, entidadId: string, entidad: string, descripcion: string): Promise<void> { const repositorio = manager.getRepository(Auditoria); const siguienteId = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>(); await repositorio.save(repositorio.create({ id: siguienteId?.id ?? '0', usuarioId, modulo: 'PRODUCCION', accion: AccionAuditoria.CREAR, entidad, entidadId, descripcion, metadatos: null, direccionIp: null, userAgent: null })); }
  async crearRevision(ordenId: string, etapaId: string, dto: CreateRevisionEtapaDto, usuario: UsuarioAutenticado) {
    if (usuario.rol !== 'DOCENTE') throw new ForbiddenException('Solo docentes pueden registrar revisiones académicas.');
    const etapa = await this.etapa(ordenId, etapaId, usuario) as { id: string; estado: EstadoOrdenProduccionEtapa };
    if (etapa.estado !== EstadoOrdenProduccionEtapa.COMPLETADA) throw new BadRequestException('Solo se revisan etapas COMPLETADA.');
    if (dto.resultado === ResultadoRevision.OBSERVADA && !dto.observacion?.trim()) throw new BadRequestException('La observación es obligatoria para una revisión OBSERVADA.');
    let revision!: RevisionEtapa;
    await this.dataSource.transaction(async manager => {
      const repositorio = manager.getRepository(RevisionEtapa); const siguiente = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
      revision = await repositorio.save(repositorio.create({ id: siguiente?.id ?? '0', ordenProduccionEtapaId: etapa.id, docenteId: usuario.sub, resultadoRevision: dto.resultado, observacion: dto.observacion?.trim() || null }));
      const accion = dto.resultado === ResultadoRevision.APROBADA ? AccionAuditoria.APROBAR : AccionAuditoria.OBSERVAR;
      await this.auditarResultadoRevision(manager, usuario.sub, revision.id, accion, dto.resultado);
      const destinatario = await manager.query('SELECT p.estudiante_id AS estudiante_id, ope.nombre_etapa_aplicado AS etapa, p.nombre AS proyecto FROM orden_produccion_etapa ope JOIN orden_produccion o ON o.id=ope.orden_produccion_id JOIN version_costeo v ON v.id=o.version_costeo_id JOIN proyecto p ON p.id=v.proyecto_id WHERE ope.id=$1', [etapa.id]) as Array<{ estudiante_id: string; etapa: string; proyecto: string }>;
      const contexto = destinatario[0]; if (contexto) { const aprobada = dto.resultado === ResultadoRevision.APROBADA; const mensaje = aprobada ? 'El docente aprobó la etapa ' + contexto.etapa + ' del proyecto ' + contexto.proyecto + '.' : 'El docente registró observaciones en la etapa ' + contexto.etapa + ' del proyecto ' + contexto.proyecto + '.'; await this.crearNotificacion(manager, contexto.estudiante_id, aprobada ? 'Etapa aprobada' : 'Etapa observada', mensaje, aprobada ? TipoNotificacion.ETAPA_APROBADA : TipoNotificacion.ETAPA_OBSERVADA, 'ORDEN_PRODUCCION_ETAPA', etapa.id); }
    });
    return this.respuestaRevision(revision, usuario);
  }
  async revisionesEtapa(ordenId: string, etapaId: string, usuario: UsuarioAutenticado) { await this.etapa(ordenId, etapaId, usuario); const revisiones = await this.revisiones.find({ where: { ordenProduccionEtapaId: etapaId }, relations: { docente: true }, order: { createdAt: 'ASC' } }); return revisiones.map(revision => this.respuestaRevision(revision)); }
  async obtenerUltimaRevision(etapaId: string): Promise<RevisionEtapa | null> { return this.revisiones.findOne({ where: { ordenProduccionEtapaId: etapaId }, relations: { docente: true }, order: { createdAt: 'DESC', id: 'DESC' } }); }
  async listadoRevisiones(filters: ListRevisionEtapasDto, usuario: UsuarioAutenticado) {
    if (!['DOCENTE', 'ADMINISTRADOR'].includes(usuario.rol)) throw new ForbiddenException('No tiene permisos para consultar revisiones académicas.');
    const params: unknown[] = []; const where = ["ope.estado='COMPLETADA'"];
    if (filters.estudiante) { params.push(filters.estudiante); where.push(`p.estudiante_id=$${params.length}`); }
    if (filters.proyecto) { params.push(filters.proyecto); where.push(`p.id=$${params.length}`); }
    if (filters.estado === 'SIN_REVISAR') where.push('ultima.id IS NULL');
    if (filters.estado === ResultadoRevision.OBSERVADA || filters.estado === ResultadoRevision.APROBADA) { params.push(filters.estado); where.push(`ultima.resultado_revision=$${params.length}`); }
    const sql = `SELECT ope.id AS "etapaId",ope.codigo_etapa_aplicado AS codigo,ope.nombre_etapa_aplicado AS nombre,ope.orden_aplicado AS orden,ope.estado AS "estadoProductivo",ope.fecha_fin AS "fechaCompletado",o.id AS "ordenId",o.codigo AS "ordenCodigo",p.id AS "proyectoId",p.nombre AS "proyectoNombre",u.id AS "estudianteId",u.nombre AS "estudianteNombre",u.apellido AS "estudianteApellido",t.id AS "tipoPrendaId",t.codigo AS "tipoPrendaCodigo",t.nombre AS "tipoPrendaNombre",(SELECT COUNT(*)::int FROM evidencia_etapa e WHERE e.orden_produccion_etapa_id=ope.id) AS "cantidadEvidencias",ultima.id AS "ultimaRevisionId",ultima.resultado_revision AS "ultimoResultado",ultima.observacion AS "ultimaObservacion",ultima.created_at AS "ultimaRevisionFecha" FROM orden_produccion_etapa ope JOIN orden_produccion o ON o.id=ope.orden_produccion_id JOIN version_costeo v ON v.id=o.version_costeo_id JOIN proyecto p ON p.id=v.proyecto_id JOIN usuario u ON u.id=p.estudiante_id JOIN tipo_prenda t ON t.id=v.tipo_prenda_id LEFT JOIN LATERAL (SELECT r.id,r.resultado_revision,r.observacion,r.created_at FROM revision_etapa r WHERE r.orden_produccion_etapa_id=ope.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) ultima ON true WHERE ${where.join(' AND ')} ORDER BY ope.fecha_fin DESC,ope.id DESC`;
    return this.revisiones.manager.query(sql, params);
  }
  private async auditarResultadoRevision(manager: EntityManager, usuarioId: string, revisionId: string, accion: AccionAuditoria, resultado: ResultadoRevision): Promise<void> { const repositorio = manager.getRepository(Auditoria); const siguiente = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>(); await repositorio.save(repositorio.create({ id: siguiente?.id ?? '0', usuarioId, modulo: 'PRODUCCION', accion, entidad: 'revision_etapa', entidadId: revisionId, descripcion: `Revisión docente ${resultado.toLowerCase()} registrada.`, metadatos: null, direccionIp: null, userAgent: null })); }
  private respuestaRevision(revision: RevisionEtapa, usuario?: UsuarioAutenticado) { return { id: revision.id, resultado_revision: revision.resultadoRevision, observacion: revision.observacion, created_at: revision.createdAt, docente: revision.docente ? { id: revision.docente.id, nombre: revision.docente.nombre, apellido: revision.docente.apellido } : undefined }; }
  private async crearNotificacion(manager: EntityManager, usuarioId: string, titulo: string, mensaje: string, tipo: TipoNotificacion, referenciaTipo: string, referenciaId: string): Promise<void> { const repositorio = manager.getRepository(Notificacion); const siguiente = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>(); await repositorio.save(repositorio.create({ id: siguiente?.id ?? '0', usuarioId, titulo, mensaje, tipo, referenciaTipo, referenciaId, leida: false, fechaLectura: null })); }
  private async versionAccesible(versionId: string, usuario: UsuarioAutenticado): Promise<VersionCosteo> {
    const version = await this.versiones.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException('Versión de costeo no encontrada.');
    const proyecto = await this.proyectos.findOneBy({ id: version.proyectoId });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado.');
    if (usuario.rol === 'ESTUDIANTE' && proyecto.estudianteId !== usuario.sub) throw new ForbiddenException('No tiene acceso a esta versión de costeo.');
    return version;
  }

  private async siguienteCodigo(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const rows = await manager.query('SELECT codigo FROM orden_produccion WHERE codigo LIKE $1', [`OP-${year}-%`]) as Array<{ codigo: string }>;
    const patron = new RegExp(`^OP-${year}-(\\d{4})$`);
    const mayor = rows.reduce((maximo, fila) => Math.max(maximo, Number(fila.codigo.match(patron)?.[1] ?? 0)), 0);
    return `OP-${year}-${String(mayor + 1).padStart(4, '0')}`;
  }

  private detalleSelect(): string {
    return `SELECT o.id,o.codigo,o.estado,o.fecha_inicio AS "fechaInicio",o.fecha_fin AS "fechaFin",o.observacion,o.created_at AS "createdAt",o.updated_at AS "updatedAt",v.id AS "versionId",v.numero_version AS "numeroVersion",v.nombre AS "versionNombre",v.total_costeo AS "totalCosteo",v.estado AS "versionEstado",p.id AS "proyectoId",p.nombre AS "proyectoNombre",p.descripcion AS "proyectoDescripcion",t.id AS "tipoPrendaId",t.codigo AS "tipoPrendaCodigo",t.nombre AS "tipoPrendaNombre",u.id AS "estudianteId",u.nombre AS "estudianteNombre",u.apellido AS "estudianteApellido",p.estudiante_id FROM orden_produccion o JOIN version_costeo v ON v.id=o.version_costeo_id JOIN proyecto p ON p.id=v.proyecto_id JOIN tipo_prenda t ON t.id=v.tipo_prenda_id JOIN usuario u ON u.id=p.estudiante_id`;
  }

  private async auditar(manager: EntityManager, usuarioId: string, ordenId: string, codigo: string): Promise<void> {
    const repositorio = manager.getRepository(Auditoria);
    const siguienteId = await repositorio.createQueryBuilder().select('COALESCE(MAX(id),0)+1', 'id').getRawOne<{ id: string }>();
    await repositorio.save(repositorio.create({ id: siguienteId?.id ?? '0', usuarioId, modulo: 'PRODUCCION', accion: AccionAuditoria.CREAR, entidad: 'orden_produccion', entidadId: ordenId, descripcion: `Orden de producción ${codigo} creada.`, metadatos: { codigo }, direccionIp: null, userAgent: null }));
  }
}







