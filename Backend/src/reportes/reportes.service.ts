import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, promises as fs } from 'fs';
import { join, resolve, sep } from 'path';
import { Repository } from 'typeorm';
import { Auditoria, AccionAuditoria } from '../administracion/entities/auditoria.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { TipoPrenda } from '../catalogos/entities/catalogos.entities';
import { VersionCosteoInsumo } from '../costeo/entities/version-costeo-insumo.entity';
import { VersionCosteoMedida } from '../costeo/entities/version-costeo-medida.entity';
import { VersionCosteoTela } from '../costeo/entities/version-costeo-tela.entity';
import { EstadoVersionCosteo, VersionCosteo } from '../costeo/entities/version-costeo.entity';
import { OrdenProduccion } from '../produccion/entities/orden-produccion.entity';
import { OrdenProduccionPdfService } from './pdf/orden-produccion-pdf.service';
import { FichaTecnicaPdfService } from './pdf/ficha-tecnica-pdf.service';
import { ReporteProyectoPdfService } from './pdf/reporte-proyecto-pdf.service';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { ReportesQueryDto } from './dto/reportes-query.dto';
import { ReporteGenerado, TipoReporte } from './entities/reporte-generado.entity';
import { CotizacionPdfService } from './pdf/cotizacion-pdf.service';

type UsuarioAuth = { sub: string; rol: string };
type RawMedida = { nombre: string; unidad: string; valor: string };
type RawTela = { nombre: string; cantidad: string; sugerida: string | null; precio: string; subtotal: string };
type RawInsumo = { nombre: string; cantidad: string; unidad: string; precio: string; subtotal: string };

@Injectable()
export class ReportesService {
  private readonly storageRoot = resolve(process.cwd(), 'uploads', 'reportes');
  constructor(
    @InjectRepository(ReporteGenerado) private readonly reportes: Repository<ReporteGenerado>,
    @InjectRepository(VersionCosteo) private readonly versiones: Repository<VersionCosteo>,
    @InjectRepository(VersionCosteoMedida) private readonly medidas: Repository<VersionCosteoMedida>,
    @InjectRepository(VersionCosteoTela) private readonly telas: Repository<VersionCosteoTela>,
    @InjectRepository(VersionCosteoInsumo) private readonly insumos: Repository<VersionCosteoInsumo>,
    @InjectRepository(Proyecto) private readonly proyectos: Repository<Proyecto>,
    @InjectRepository(TipoPrenda) private readonly prendas: Repository<TipoPrenda>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(OrdenProduccion) private readonly ordenes: Repository<OrdenProduccion>,
    @InjectRepository(Auditoria) private readonly auditorias: Repository<Auditoria>,
    private readonly pdf: CotizacionPdfService,
    private readonly ordenPdf: OrdenProduccionPdfService,
    private readonly fichaPdf: FichaTecnicaPdfService,
    private readonly proyectoPdf: ReporteProyectoPdfService,
  ) {}

  async listar(filtros: ReportesQueryDto, usuario: UsuarioAuth) {
    const query = this.reportes.createQueryBuilder('reporte')
      .leftJoinAndSelect('reporte.proyecto', 'proyecto')
      .leftJoinAndSelect('proyecto.estudiante', 'estudiante')
      .leftJoinAndSelect('reporte.generadoPor', 'generadoPor')
      .leftJoinAndSelect('reporte.versionCosteo', 'version')
      .leftJoinAndSelect('reporte.ordenProduccion', 'orden')
      .orderBy('reporte.createdAt', 'DESC');
    if (usuario.rol === 'ESTUDIANTE') query.andWhere('proyecto.estudianteId = :usuarioId', { usuarioId: usuario.sub });
    if (filtros.proyectoId) query.andWhere('reporte.proyectoId = :proyectoId', { proyectoId: String(filtros.proyectoId) });
    if (filtros.tipo) query.andWhere('reporte.tipoReporte = :tipo', { tipo: filtros.tipo });
    return (await query.getMany()).map(reporte => this.respuesta(reporte));
  }

  async detalle(id: string, usuario: UsuarioAuth) {
    const reporte = await this.buscarReporte(id); this.validarAcceso(reporte.proyecto, usuario); return this.respuesta(reporte);
  }

  async archivo(id: string, usuario: UsuarioAuth) {
    const reporte = await this.buscarReporte(id); this.validarAcceso(reporte.proyecto, usuario);
    const path = this.resolverArchivo(reporte.storageKey);
    try { await fs.access(path); } catch { throw new NotFoundException('Archivo del reporte no disponible.'); }
    return { stream: createReadStream(path), nombre: reporte.nombreArchivo };
  }

  async generarCotizacion(versionId: string, usuario: UsuarioAuth) {
    const version = await this.versiones.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException('Versión de costeo no encontrada.');
    if (version.estado !== EstadoVersionCosteo.FINALIZADA) throw new BadRequestException('La cotización solo puede generarse para una versión FINALIZADA.');
    const proyecto = await this.proyectos.findOne({ where: { id: version.proyectoId }, relations: { estudiante: true } });
    if (!proyecto) throw new NotFoundException('Proyecto de la versión no encontrado.');
    this.validarAcceso(proyecto, usuario);
    const prenda = await this.prendas.findOneBy({ id: version.tipoPrendaId });
    if (!prenda) throw new NotFoundException('Tipo de prenda no encontrado.');
    const data = await this.datosCotizacion(version, proyecto, prenda.nombre);
    const pdf = await this.pdf.generar(data);
    const fecha = new Date(); const nombre = this.nombreArchivo(proyecto.nombre, version.numeroVersion, fecha);
    let path: string | undefined;
    try {
      return await this.reportes.manager.transaction(async manager => {
        const next = await manager.getRepository(ReporteGenerado).createQueryBuilder('reporte').select('COALESCE(MAX(reporte.id), 0) + 1', 'id').getRawOne<{ id: string }>();
        const id = next?.id ?? '1'; const key = join(proyecto.id, id, nombre).replace(/\\/g, '/'); path = this.resolverArchivo(key);
        await fs.mkdir(join(this.storageRoot, proyecto.id, id), { recursive: true }); await fs.writeFile(path, pdf);
        const creado = await manager.getRepository(ReporteGenerado).save(manager.getRepository(ReporteGenerado).create({ id, proyectoId: proyecto.id, generadoPorUsuarioId: usuario.sub, tipoReporte: TipoReporte.COTIZACION, versionCosteoId: version.id, ordenProduccionId: null, storageKey: key, nombreArchivo: nombre }));
        const auditId = await manager.getRepository(Auditoria).createQueryBuilder('auditoria').select('COALESCE(MAX(auditoria.id), 0) + 1', 'id').getRawOne<{ id: string }>();
        await manager.getRepository(Auditoria).save(manager.getRepository(Auditoria).create({ id: auditId?.id ?? '1', usuarioId: usuario.sub, modulo: 'REPORTES', accion: AccionAuditoria.CREAR, entidad: 'reporte_generado', entidadId: creado.id, descripcion: 'Cotización académica generada.', metadatos: null, direccionIp: null, userAgent: null }));
        const detalle = await manager.getRepository(ReporteGenerado).findOne({ where: { id: creado.id }, relations: { proyecto: { estudiante: true }, generadoPor: true, versionCosteo: true, ordenProduccion: true } });
        if (!detalle) throw new NotFoundException('Reporte generado no encontrado.');
        return this.respuesta(detalle);
      });
    } catch (error) { if (path) await fs.rm(path, { force: true }); throw error; }
  }

  async generarReporteProyecto(proyectoId: string, usuario: UsuarioAuth) {
    const proyecto=await this.proyectos.findOne({where:{id:proyectoId},relations:{estudiante:true}});if(!proyecto)throw new NotFoundException('Proyecto no encontrado.');this.validarAcceso(proyecto,usuario);const versiones=await this.versiones.find({where:{proyectoId},order:{numeroVersion:'ASC'}});const principal=[...versiones].filter(v=>v.estado===EstadoVersionCosteo.FINALIZADA).sort((a,b)=>b.numeroVersion-a.numeroVersion)[0];if(!principal)throw new BadRequestException('El proyecto no tiene una versión FINALIZADA para consolidar.');const prenda=await this.prendas.findOneBy({id:principal.tipoPrendaId});if(!prenda)throw new NotFoundException('Tipo de prenda no encontrado.');const base=await this.datosCotizacion(principal,proyecto,prenda.nombre);const orden=await this.ordenes.findOneBy({versionCosteoId:principal.id});let proceso:any=null;if(orden){const es=await this.ordenes.manager.query(`SELECT ope.orden_aplicado AS orden,ope.nombre_etapa_aplicado AS nombre,ope.estado,ope.fecha_inicio AS inicio,ope.fecha_fin AS fin,(SELECT COUNT(*)::int FROM evidencia_etapa e WHERE e.orden_produccion_etapa_id=ope.id) AS evidencias,ultima.resultado_revision AS revision FROM orden_produccion_etapa ope LEFT JOIN LATERAL (SELECT r.resultado_revision FROM revision_etapa r WHERE r.orden_produccion_etapa_id=ope.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) ultima ON true WHERE ope.orden_produccion_id=$1 ORDER BY ope.orden_aplicado`,[orden.id]);proceso={codigo:orden.codigo,estado:orden.estado,inicio:orden.fechaInicio,fin:orden.fechaFin,etapas:es.map((e:Record<string,unknown>)=>({orden:Number(e.orden),nombre:String(e.nombre),estado:String(e.estado),inicio:e.inicio as Date|null,fin:e.fin as Date|null,evidencias:Number(e.evidencias),revision:e.revision?String(e.revision):null}))}}const pdf=await this.proyectoPdf.generar({proyecto:{nombre:proyecto.nombre,descripcion:proyecto.descripcion,estado:proyecto.estado,estudiante:`${proyecto.estudiante.nombre} ${proyecto.estudiante.apellido}`,creado:proyecto.createdAt,actualizado:proyecto.updatedAt},versiones:await Promise.all(versiones.map(async v=>({numero:v.numeroVersion,nombre:v.nombre,estado:v.estado,prenda:(await this.prendas.findOneBy({id:v.tipoPrendaId}))?.nombre??'No disponible',total:v.totalCosteo,padre:v.versionPadreId,fecha:v.createdAt}))),base:{numero:principal.numeroVersion,nombre:principal.nombre,prenda:prenda.nombre,...base.resumen,medidas:base.medidas,telas:base.telas,insumos:base.insumos},produccion:proceso});const fecha=new Date(),nombre=this.nombreArchivoProyecto(proyecto.nombre,fecha);let path:string|undefined;try{return await this.reportes.manager.transaction(async manager=>{const n=await manager.getRepository(ReporteGenerado).createQueryBuilder('r').select('COALESCE(MAX(r.id),0)+1','id').getRawOne<{id:string}>(),id=n?.id??'1',key=join(proyecto.id,id,nombre).replace(/\\/g,'/');path=this.resolverArchivo(key);await fs.mkdir(join(this.storageRoot,proyecto.id,id),{recursive:true});await fs.writeFile(path,pdf);const creado=await manager.getRepository(ReporteGenerado).save(manager.getRepository(ReporteGenerado).create({id,proyectoId:proyecto.id,generadoPorUsuarioId:usuario.sub,tipoReporte:TipoReporte.REPORTE_PROYECTO,versionCosteoId:principal.id,ordenProduccionId:orden?.id??null,storageKey:key,nombreArchivo:nombre}));const a=await manager.getRepository(Auditoria).createQueryBuilder('a').select('COALESCE(MAX(a.id),0)+1','id').getRawOne<{id:string}>();await manager.getRepository(Auditoria).save(manager.getRepository(Auditoria).create({id:a?.id??'1',usuarioId:usuario.sub,modulo:'REPORTES',accion:AccionAuditoria.CREAR,entidad:'reporte_generado',entidadId:creado.id,descripcion:'Reporte general del proyecto generado.',metadatos:null,direccionIp:null,userAgent:null}));const d=await manager.getRepository(ReporteGenerado).findOne({where:{id:creado.id},relations:{proyecto:{estudiante:true},generadoPor:true,versionCosteo:true,ordenProduccion:true}});if(!d)throw new NotFoundException('Reporte generado no encontrado.');return this.respuesta(d)})}catch(e){if(path)await fs.rm(path,{force:true});throw e}
  }
  async generarFichaTecnica(versionId: string, usuario: UsuarioAuth) {
    const version = await this.versiones.findOneBy({ id: versionId }); if (!version) throw new NotFoundException('Versión de costeo no encontrada.'); if (version.estado !== EstadoVersionCosteo.FINALIZADA) throw new BadRequestException('La ficha técnica solo puede generarse para una versión FINALIZADA.');
    const proyecto = await this.proyectos.findOne({ where: { id: version.proyectoId }, relations: { estudiante: true } }); if (!proyecto) throw new NotFoundException('Proyecto no encontrado.'); this.validarAcceso(proyecto, usuario);
    const prenda = await this.prendas.findOneBy({ id: version.tipoPrendaId }); if (!prenda) throw new NotFoundException('Tipo de prenda no encontrado.'); const base = await this.datosCotizacion(version, proyecto, prenda.nombre);
    const orden = await this.ordenes.findOneBy({ versionCosteoId: versionId }); let proceso: any = null;
    if (orden) { const etapas = await this.ordenes.manager.query(`SELECT ope.orden_aplicado AS orden,ope.nombre_etapa_aplicado AS nombre,ope.estado,(SELECT COUNT(*)::int FROM evidencia_etapa e WHERE e.orden_produccion_etapa_id=ope.id) AS evidencias,ultima.resultado_revision AS revision,ultima.observacion,docente.nombre AS "docenteNombre",docente.apellido AS "docenteApellido" FROM orden_produccion_etapa ope LEFT JOIN LATERAL (SELECT r.resultado_revision,r.observacion,r.docente_id FROM revision_etapa r WHERE r.orden_produccion_etapa_id=ope.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) ultima ON true LEFT JOIN usuario docente ON docente.id=ultima.docente_id WHERE ope.orden_produccion_id=$1 ORDER BY ope.orden_aplicado ASC`, [orden.id]); proceso={codigo:orden.codigo,estado:orden.estado,inicio:orden.fechaInicio,fin:orden.fechaFin,etapas:etapas.map((e:Record<string,unknown>)=>({orden:Number(e.orden),nombre:String(e.nombre),estado:String(e.estado),evidencias:Number(e.evidencias),revision:e.revision?String(e.revision):null,docente:e.revision?`${e.docenteNombre??''} ${e.docenteApellido??''}`.trim():null,observacion:e.observacion as string|null}))}; }
    const diseno = await this.datosFichaDiseno(proyecto.id);
    const sam = await this.versiones.manager.query(`SELECT op.codigo,op.nombre,linea.sam_aplicado::text AS aplicado,linea.cantidad::text AS cantidad,linea.subtotal_minutos::text AS subtotal FROM version_costeo_operacion_sam linea JOIN operacion_sam op ON op.id=linea.operacion_sam_id WHERE linea.version_costeo_id=$1 ORDER BY linea.id ASC`, [version.id]) as Array<{codigo:string;nombre:string;aplicado:string;cantidad:string;subtotal:string}>;
    const samTotal = sam.reduce((total, linea) => total + Number(linea.subtotal), 0).toFixed(2);
    const pdf=await this.fichaPdf.generar({...base,estado:version.estado,orden:proceso,diseno:diseno?.datos??null,imagenes:diseno?.imagenes??[],sam,samTotal});const fecha=new Date();const nombre=this.nombreArchivoFicha(proyecto.nombre,version.numeroVersion,fecha);let path:string|undefined;
    try{return await this.reportes.manager.transaction(async manager=>{const next=await manager.getRepository(ReporteGenerado).createQueryBuilder('reporte').select('COALESCE(MAX(reporte.id),0)+1','id').getRawOne<{id:string}>();const id=next?.id??'1';const key=join(proyecto.id,id,nombre).replace(/\\/g,'/');path=this.resolverArchivo(key);await fs.mkdir(join(this.storageRoot,proyecto.id,id),{recursive:true});await fs.writeFile(path,pdf);const creado=await manager.getRepository(ReporteGenerado).save(manager.getRepository(ReporteGenerado).create({id,proyectoId:proyecto.id,generadoPorUsuarioId:usuario.sub,tipoReporte:TipoReporte.FICHA_TECNICA,versionCosteoId:version.id,ordenProduccionId:orden?.id??null,storageKey:key,nombreArchivo:nombre}));const aid=await manager.getRepository(Auditoria).createQueryBuilder('a').select('COALESCE(MAX(a.id),0)+1','id').getRawOne<{id:string}>();await manager.getRepository(Auditoria).save(manager.getRepository(Auditoria).create({id:aid?.id??'1',usuarioId:usuario.sub,modulo:'REPORTES',accion:AccionAuditoria.CREAR,entidad:'reporte_generado',entidadId:creado.id,descripcion:'Ficha técnica generada.',metadatos:null,direccionIp:null,userAgent:null}));const detalle=await manager.getRepository(ReporteGenerado).findOne({where:{id:creado.id},relations:{proyecto:{estudiante:true},generadoPor:true,versionCosteo:true,ordenProduccion:true}});if(!detalle)throw new NotFoundException('Reporte generado no encontrado.');return this.respuesta(detalle)});}catch(error){if(path)await fs.rm(path,{force:true});throw error;}
  }
  async generarOrdenProduccion(ordenId: string, usuario: UsuarioAuth) {
    const rows = await this.ordenes.manager.query(`SELECT o.id,o.codigo,o.estado,o.created_at AS "createdAt",o.fecha_inicio AS "fechaInicio",o.fecha_fin AS "fechaFin",v.id AS "versionId",v.numero_version AS "numeroVersion",v.subtotal_materiales AS "subtotalMateriales",v.valor_mano_obra AS "valorManoObra",v.valor_ganancia AS "valorGanancia",v.total_costeo AS total,p.id AS "proyectoId",p.nombre AS proyecto,u.id AS "estudianteId",u.nombre AS "estudianteNombre",u.apellido AS "estudianteApellido",t.nombre AS prenda FROM orden_produccion o JOIN version_costeo v ON v.id=o.version_costeo_id JOIN proyecto p ON p.id=v.proyecto_id JOIN usuario u ON u.id=p.estudiante_id JOIN tipo_prenda t ON t.id=v.tipo_prenda_id WHERE o.id=$1`, [ordenId]);
    const orden = rows[0];
    if (!orden) throw new NotFoundException('Orden de producción no encontrada.');
    if (usuario.rol === 'ESTUDIANTE' && String(orden.estudianteId) !== String(usuario.sub)) throw new ForbiddenException('No tiene acceso a esta orden de producción.');
    if (!['EN_PROCESO', 'FINALIZADA'].includes(orden.estado)) throw new BadRequestException('El reporte de orden está disponible para órdenes EN_PROCESO o FINALIZADA.');
    const etapas = await this.ordenes.manager.query(`SELECT ope.orden_aplicado AS orden,ope.codigo_etapa_aplicado AS codigo,ope.nombre_etapa_aplicado AS nombre,ope.estado,ope.fecha_inicio AS inicio,ope.fecha_fin AS fin,ope.observacion_estudiante AS observacion,(SELECT COUNT(*)::int FROM evidencia_etapa e WHERE e.orden_produccion_etapa_id=ope.id) AS evidencias,ultima.resultado_revision AS "revisionResultado",ultima.observacion AS "revisionObservacion",ultima.created_at AS "revisionFecha",docente.nombre AS "docenteNombre",docente.apellido AS "docenteApellido" FROM orden_produccion_etapa ope LEFT JOIN LATERAL (SELECT r.resultado_revision,r.observacion,r.created_at,r.docente_id FROM revision_etapa r WHERE r.orden_produccion_etapa_id=ope.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) ultima ON true LEFT JOIN usuario docente ON docente.id=ultima.docente_id WHERE ope.orden_produccion_id=$1 ORDER BY ope.orden_aplicado ASC`, [ordenId]);
    const data = { codigo: orden.codigo, proyecto: orden.proyecto, estudiante: `${orden.estudianteNombre} ${orden.estudianteApellido}`, prenda: orden.prenda, version: Number(orden.numeroVersion), estado: orden.estado, createdAt: orden.createdAt, fechaInicio: orden.fechaInicio, fechaFin: orden.fechaFin, resumen: { subtotalMateriales: orden.subtotalMateriales, valorManoObra: orden.valorManoObra, valorGanancia: orden.valorGanancia, total: orden.total }, etapas: etapas.map((etapa: Record<string, unknown>) => ({ orden: Number(etapa.orden), codigo: String(etapa.codigo), nombre: String(etapa.nombre), estado: String(etapa.estado), inicio: etapa.inicio as Date | null, fin: etapa.fin as Date | null, observacion: etapa.observacion as string | null, evidencias: Number(etapa.evidencias), revision: etapa.revisionResultado ? { resultado: String(etapa.revisionResultado), docente: `${etapa.docenteNombre ?? ''} ${etapa.docenteApellido ?? ''}`.trim(), fecha: etapa.revisionFecha as Date, observacion: etapa.revisionObservacion as string | null } : null })) };
    const pdf = await this.ordenPdf.generar(data); const fecha = new Date(); const nombre = this.nombreArchivoOrden(orden.codigo, fecha); let path: string | undefined;
    try { return await this.reportes.manager.transaction(async manager => {
      const next = await manager.getRepository(ReporteGenerado).createQueryBuilder('reporte').select('COALESCE(MAX(reporte.id), 0) + 1', 'id').getRawOne<{ id: string }>();
      const id = next?.id ?? '1'; const key = join(String(orden.proyectoId), id, nombre).replace(/\\/g, '/'); path = this.resolverArchivo(key); await fs.mkdir(join(this.storageRoot, String(orden.proyectoId), id), { recursive: true }); await fs.writeFile(path, pdf);
      const creado = await manager.getRepository(ReporteGenerado).save(manager.getRepository(ReporteGenerado).create({ id, proyectoId: String(orden.proyectoId), generadoPorUsuarioId: usuario.sub, tipoReporte: TipoReporte.ORDEN_PRODUCCION, versionCosteoId: String(orden.versionId), ordenProduccionId: ordenId, storageKey: key, nombreArchivo: nombre }));
      const auditId = await manager.getRepository(Auditoria).createQueryBuilder('auditoria').select('COALESCE(MAX(auditoria.id), 0) + 1', 'id').getRawOne<{ id: string }>();
      await manager.getRepository(Auditoria).save(manager.getRepository(Auditoria).create({ id: auditId?.id ?? '1', usuarioId: usuario.sub, modulo: 'REPORTES', accion: AccionAuditoria.CREAR, entidad: 'reporte_generado', entidadId: creado.id, descripcion: 'Reporte de orden de producción generado.', metadatos: null, direccionIp: null, userAgent: null }));
      const detalle = await manager.getRepository(ReporteGenerado).findOne({ where: { id: creado.id }, relations: { proyecto: { estudiante: true }, generadoPor: true, versionCosteo: true, ordenProduccion: true } }); if (!detalle) throw new NotFoundException('Reporte generado no encontrado.'); return this.respuesta(detalle);
    }); } catch (error) { if (path) await fs.rm(path, { force: true }); throw error; }
  }
  private async datosFichaDiseno(proyectoId: string): Promise<{ datos: { nombreColeccion:string|null;referencia:string|null;temporada:string|null;marca:string|null;linea:string|null;categoria:string|null;target:string|null;estilo:string|null;silueta:string|null;tallas:string|null;uso:string|null;fundamentacion:string|null;detallesConstructivos:string|null;acabados:string|null;tejidoReferencial:string|null;paletaColores:Array<{nombre:string;hex:string}>|null }; imagenes:Array<{titulo:string;path:string|null}> }|null> {
    const rows = await this.reportes.manager.query(`SELECT nombre_coleccion AS "nombreColeccion",referencia,temporada,marca,linea,categoria,target,estilo,silueta,tallas,uso,fundamentacion,detalles_constructivos AS "detallesConstructivos",acabados,tejido_referencial AS "tejidoReferencial",paleta_colores AS "paletaColores",imagen_delantera_storage_key AS delantera,imagen_espalda_storage_key AS espalda,imagen_detalle_storage_key AS detalle,imagen_tejido_storage_key AS tejido FROM ficha_diseno WHERE proyecto_id=$1`, [proyectoId]) as Array<Record<string, unknown>>;
    const row = rows[0]; if (!row) return null;
    const image = async (titulo:string,key:unknown):Promise<{titulo:string;path:string|null}> => { if(typeof key!=='string'||!key) return {titulo,path:null}; const root=resolve(process.cwd(),'uploads','fichas-diseno');const file=resolve(root,key);if(!file.startsWith(`${root}${sep}`))return {titulo,path:null};try{await fs.access(file);return {titulo,path:file};}catch{return {titulo,path:null};} };
    const paleta = Array.isArray(row.paletaColores) ? row.paletaColores.filter((color): color is {nombre:string;hex:string} => typeof color==='object' && color!==null && typeof (color as {nombre?:unknown}).nombre==='string' && typeof (color as {hex?:unknown}).hex==='string') : null;
    return { datos:{nombreColeccion:row.nombreColeccion as string|null,referencia:row.referencia as string|null,temporada:row.temporada as string|null,marca:row.marca as string|null,linea:row.linea as string|null,categoria:row.categoria as string|null,target:row.target as string|null,estilo:row.estilo as string|null,silueta:row.silueta as string|null,tallas:row.tallas as string|null,uso:row.uso as string|null,fundamentacion:row.fundamentacion as string|null,detallesConstructivos:row.detallesConstructivos as string|null,acabados:row.acabados as string|null,tejidoReferencial:row.tejidoReferencial as string|null,paletaColores:paleta}, imagenes: await Promise.all([image('VISTA DELANTERA',row.delantera),image('VISTA POSTERIOR',row.espalda),image('DETALLE',row.detalle),image('TEJIDO REFERENCIAL',row.tejido)]) };
  }
  private async datosCotizacion(version: VersionCosteo, proyecto: Proyecto, prenda: string) {
    const medidas = await this.medidas.query<RawMedida[]>(`SELECT medida.nombre AS nombre, medida.unidad AS unidad, linea.valor::text AS valor FROM version_costeo_medida linea JOIN tipo_prenda_medida relacion ON relacion.id = linea.tipo_prenda_medida_id JOIN medida ON medida.id = relacion.medida_id WHERE linea.version_costeo_id = $1 ORDER BY relacion.orden_visualizacion ASC`, [version.id]);
    const telas = await this.telas.query<RawTela[]>(`SELECT tela.nombre AS nombre, linea.cantidad_metros::text AS cantidad, linea.cantidad_metros_sugerida::text AS sugerida, linea.precio_metro_aplicado::text AS precio, linea.subtotal::text AS subtotal FROM version_costeo_tela linea JOIN tela ON tela.id = linea.tela_id WHERE linea.version_costeo_id = $1 ORDER BY linea.id ASC`, [version.id]);
    const insumos = await this.insumos.query<RawInsumo[]>(`SELECT insumo.nombre AS nombre, linea.cantidad::text AS cantidad, linea.unidad_medida_aplicada AS unidad, linea.precio_unitario_aplicado::text AS precio, linea.subtotal::text AS subtotal FROM version_costeo_insumo linea JOIN insumo ON insumo.id = linea.insumo_id WHERE linea.version_costeo_id = $1 ORDER BY linea.id ASC`, [version.id]);
    return { proyecto: proyecto.nombre, estudiante: `${proyecto.estudiante.nombre} ${proyecto.estudiante.apellido}`, prenda, version: version.numeroVersion, fecha: new Date(), medidas, telas, insumos, resumen: { subtotalTelas: version.subtotalTelas, subtotalInsumos: version.subtotalInsumos, subtotalMateriales: version.subtotalMateriales, porcentajeManoObra: version.porcentajeManoObra, valorManoObra: version.valorManoObra, porcentajeGanancia: version.porcentajeGanancia, valorGanancia: version.valorGanancia, total: version.totalCosteo } };
  }

  private async buscarReporte(id: string) { const reporte = await this.reportes.findOne({ where: { id }, relations: { proyecto: { estudiante: true }, generadoPor: true, versionCosteo: true, ordenProduccion: true } }); if (!reporte) throw new NotFoundException('Reporte no encontrado.'); return reporte; }
  private async detalleConRelaciones(id: string) { return this.respuesta(await this.buscarReporte(id)); }
  private validarAcceso(proyecto: Proyecto, usuario: UsuarioAuth): void { if (usuario.rol === 'ESTUDIANTE' && proyecto.estudianteId !== usuario.sub) throw new ForbiddenException('No tiene acceso a los reportes de este proyecto.'); }
  private resolverArchivo(key: string): string { const path = resolve(this.storageRoot, key); if (!path.startsWith(`${this.storageRoot}${sep}`)) throw new NotFoundException('Archivo no disponible.'); return path; }
  private nombreArchivoProyecto(proyecto: string, fecha: Date): string { const base = proyecto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Proyecto'; return 'ReporteProyecto_' + base + '_' + fecha.toISOString().replace(/[:.]/g, '-') + '.pdf'; }
  private nombreArchivoFicha(proyecto: string, version: number, fecha: Date): string { const base = proyecto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Proyecto'; const stamp = fecha.toISOString().replace(/[:.]/g, '-'); return 'FichaTecnica_' + base + '_V' + version + '_' + stamp + '.pdf'; }
  private nombreArchivoOrden(codigo: string, fecha: Date): string { const seguro = codigo.replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 60) || 'Orden'; const stamp = fecha.toISOString().replace(/[:.]/g, '-'); return 'OrdenProduccion_' + seguro + '_' + stamp + '.pdf'; }
  private nombreArchivo(proyecto: string, version: number, fecha: Date): string { const base = proyecto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Proyecto'; const stamp = fecha.toISOString().replace(/[:.]/g, '-'); return `Cotizacion_${base}_V${version}_${stamp}.pdf`; }
  private respuesta(reporte: ReporteGenerado) { return { id: reporte.id, tipoReporte: reporte.tipoReporte, nombreArchivo: reporte.nombreArchivo, createdAt: reporte.createdAt, proyecto: reporte.proyecto ? { id: reporte.proyecto.id, nombre: reporte.proyecto.nombre, estudiante: reporte.proyecto.estudiante ? { id: reporte.proyecto.estudiante.id, nombre: reporte.proyecto.estudiante.nombre, apellido: reporte.proyecto.estudiante.apellido } : undefined } : undefined, generadoPor: reporte.generadoPor ? { id: reporte.generadoPor.id, nombre: reporte.generadoPor.nombre, apellido: reporte.generadoPor.apellido } : undefined, versionCosteo: reporte.versionCosteo ? { id: reporte.versionCosteo.id, numeroVersion: reporte.versionCosteo.numeroVersion, estado: reporte.versionCosteo.estado } : null, ordenProduccion: reporte.ordenProduccion ? { id: reporte.ordenProduccion.id, codigo: reporte.ordenProduccion.codigo, estado: reporte.ordenProduccion.estado } : null }; }
}