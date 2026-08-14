import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { TipoPrenda, Medida, Tela, Insumo, TipoPrendaMedida, ReglaConsumoTela } from './entities/catalogos.entities';
import { EstadoCatalogo } from '../auth/entities/rol.entity';
import { Auditoria, AccionAuditoria } from '../administracion/entities/auditoria.entity';

type CatalogName = 'tipos-prenda' | 'medidas' | 'telas' | 'insumos' | 'reglas-consumo-tela';
type CatalogRecord = { id: string; estado?: EstadoCatalogo; [key: string]: unknown };
type Mutation = object;

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(TipoPrenda) private readonly tiposPrenda: Repository<TipoPrenda>,
    @InjectRepository(Medida) private readonly medidasRepo: Repository<Medida>,
    @InjectRepository(Tela) private readonly telasRepo: Repository<Tela>,
    @InjectRepository(Insumo) private readonly insumosRepo: Repository<Insumo>,
    @InjectRepository(TipoPrendaMedida) private readonly prendaMedidas: Repository<TipoPrendaMedida>,
    @InjectRepository(ReglaConsumoTela) private readonly reglasRepo: Repository<ReglaConsumoTela>,
    @InjectRepository(Auditoria) private readonly auditoriaRepo: Repository<Auditoria>,
  ) {}

  private repo(name: CatalogName): Repository<CatalogRecord> {
    const repositories: Record<CatalogName, Repository<ObjectLiteral>> = {
      'tipos-prenda': this.tiposPrenda,
      medidas: this.medidasRepo,
      telas: this.telasRepo,
      insumos: this.insumosRepo,
      'reglas-consumo-tela': this.reglasRepo,
    };
    return repositories[name] as Repository<CatalogRecord>;
  }

  private entidad(name: CatalogName): string {
    return {
      'tipos-prenda': 'tipo_prenda', medidas: 'medida', telas: 'tela',
      insumos: 'insumo', 'reglas-consumo-tela': 'regla_consumo_tela',
    }[name];
  }

  private async nextId(repository: Repository<CatalogRecord>): Promise<string> {
    const result = await repository.createQueryBuilder().select('COALESCE(MAX(id), 0) + 1', 'id').getRawOne<{ id: string }>();
    if (!result) throw new BadRequestException('No fue posible generar el identificador del registro.');
    return result.id;
  }

  private conflict(error: unknown): never {
    const code = (error as { code?: string }).code;
    if (code === '23505') throw new ConflictException('El registro ya existe o entra en conflicto con otro registro.');
    if (code === '23503') throw new BadRequestException('La relación indicada no existe o no es válida.');
    throw error;
  }

  async list(name: CatalogName, filters: Record<string, string>): Promise<CatalogRecord[]> {
    const where = filters.estado ? { estado: filters.estado as EstadoCatalogo } : {};
    return this.repo(name).find({ where });
  }

  async one(name: CatalogName, id: string): Promise<CatalogRecord> {
    const record = await this.repo(name).findOneBy({ id });
    if (!record) throw new NotFoundException('Registro no encontrado.');
    return record;
  }

  private async validarReglaActiva(data: Mutation, excludeId?: string): Promise<void> {
    const ruleData = data as { tipoPrendaId?: string; estado?: EstadoCatalogo };
    const tipoPrendaId = ruleData.tipoPrendaId;
    const estado = ruleData.estado;
    if (!tipoPrendaId || estado !== EstadoCatalogo.ACTIVO) return;
    await this.one('tipos-prenda', tipoPrendaId);
    const existente = await this.reglasRepo.createQueryBuilder('regla')
      .where('regla.tipo_prenda_id = :tipoPrendaId', { tipoPrendaId })
      .andWhere('regla.estado = :estado', { estado: EstadoCatalogo.ACTIVO })
      .andWhere(excludeId ? 'regla.id <> :excludeId' : '1 = 1', { excludeId })
      .getOne();
    if (existente) throw new ConflictException('Ya existe una regla ACTIVA para este tipo de prenda.');
  }

  async save(name: CatalogName, data: Mutation, usuarioId: string, id?: string): Promise<CatalogRecord> {
    const repository = this.repo(name);
    try {
      const current = id ? await this.one(name, id) : undefined;
      const effective = { ...(current ?? {}), ...data } as Mutation;
      if (name === 'reglas-consumo-tela') await this.validarReglaActiva(effective, id);
      const record = current ?? repository.create({ id: await this.nextId(repository) });
      Object.assign(record, data);
      const saved = await repository.save(record);
      await this.audit(usuarioId, id ? AccionAuditoria.ACTUALIZAR : AccionAuditoria.CREAR, this.entidad(name), saved.id, id ? 'Registro actualizado.' : 'Registro creado.');
      return saved;
    } catch (error: unknown) { this.conflict(error); }
  }

  async estado(name: CatalogName, id: string, estado: EstadoCatalogo, usuarioId: string): Promise<CatalogRecord> {
    const repository = this.repo(name);
    try {
      const record = await this.one(name, id);
      if (name === 'reglas-consumo-tela' && estado === EstadoCatalogo.ACTIVO) {
        await this.validarReglaActiva({ tipoPrendaId: record['tipoPrendaId'] as string, estado }, id);
      }
      record.estado = estado;
      const saved = await repository.save(record);
      await this.audit(usuarioId, estado === EstadoCatalogo.INACTIVO ? AccionAuditoria.DESACTIVAR : AccionAuditoria.ACTUALIZAR, this.entidad(name), saved.id, 'Estado actualizado.');
      return saved;
    } catch (error: unknown) { this.conflict(error); }
  }

  private async audit(usuarioId: string, accion: AccionAuditoria, entidad: string, entidadId: string, descripcion: string): Promise<void> {
    const next = await this.auditoriaRepo.createQueryBuilder().select('COALESCE(MAX(id), 0) + 1', 'id').getRawOne<{ id: string }>();
    await this.auditoriaRepo.save(this.auditoriaRepo.create({ id: (next?.id ?? (() => { throw new BadRequestException('No fue posible generar el identificador de auditoría.'); })()), usuarioId, modulo: 'CATALOGOS', accion, entidad, entidadId, descripcion, metadatos: null, direccionIp: null, userAgent: null }));
  }

  async medidas(tipoPrendaId: string): Promise<Record<string, unknown>[]> {
    await this.one('tipos-prenda', tipoPrendaId);
    return this.prendaMedidas.createQueryBuilder('relacion').innerJoin(Medida, 'medida', 'medida.id = relacion.medida_id')
      .where('relacion.tipo_prenda_id = :tipoPrendaId', { tipoPrendaId })
      .select(['relacion.id AS relacion_id', 'relacion.medida_id AS medida_id', 'medida.codigo AS codigo', 'medida.nombre AS nombre', 'medida.unidad AS unidad', 'relacion.obligatorio AS obligatorio', 'relacion.orden_visualizacion AS orden_visualizacion', 'relacion.estado AS estado'])
      .orderBy('relacion.orden_visualizacion', 'ASC').getRawMany();
  }

  async addMedida(tipoPrendaId: string, data: { medidaId: string; ordenVisualizacion: number; obligatorio: boolean }, usuarioId: string): Promise<TipoPrendaMedida> {
    await this.one('tipos-prenda', tipoPrendaId);
    await this.one('medidas', data.medidaId);
    try {
      const record = this.prendaMedidas.create({ id: await this.nextId(this.prendaMedidas as unknown as Repository<CatalogRecord>), tipoPrendaId, medidaId: data.medidaId, ordenVisualizacion: data.ordenVisualizacion, obligatorio: data.obligatorio, estado: EstadoCatalogo.ACTIVO });
      const saved = await this.prendaMedidas.save(record);
      await this.audit(usuarioId, AccionAuditoria.CREAR, 'tipo_prenda_medida', saved.id, 'Relación creada.');
      return saved;
    } catch (error: unknown) { this.conflict(error); }
  }

  async updMedida(tipoPrendaId: string, relacionId: string, data: { ordenVisualizacion?: number; obligatorio?: boolean; estado?: EstadoCatalogo }, usuarioId: string): Promise<TipoPrendaMedida> {
    try {
      const record = await this.prendaMedidas.findOneBy({ id: relacionId, tipoPrendaId });
      if (!record) throw new NotFoundException('Relación no encontrada.');
      Object.assign(record, data);
      const saved = await this.prendaMedidas.save(record);
      const accion = data.estado === EstadoCatalogo.INACTIVO ? AccionAuditoria.DESACTIVAR : AccionAuditoria.ACTUALIZAR;
      await this.audit(usuarioId, accion, 'tipo_prenda_medida', saved.id, accion === AccionAuditoria.DESACTIVAR ? 'Relación desactivada.' : 'Relación actualizada.');
      return saved;
    } catch (error: unknown) { this.conflict(error); }
  }
}

