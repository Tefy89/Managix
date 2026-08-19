import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export type OrdenProduccionPdfData = {
  codigo: string; proyecto: string; estudiante: string; prenda: string; version: number; estado: string;
  createdAt: Date; fechaInicio: Date | null; fechaFin: Date | null;
  resumen: { subtotalMateriales: string; valorManoObra: string; valorGanancia: string; total: string };
  etapas: Array<{ orden: number; codigo: string; nombre: string; estado: string; inicio: Date | null; fin: Date | null; observacion: string | null; evidencias: number; revision: { resultado: string; docente: string; fecha: Date; observacion: string | null } | null }>;
};

@Injectable()
export class OrdenProduccionPdfService {
  async generar(data: OrdenProduccionPdfData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 46, compress: false, info: { Title: 'Orden de Producción MANAGIX', Author: 'MANAGIX' } });
    const chunks: Buffer[] = []; doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const fin = new Promise<Buffer>((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
    const date = (value: Date | null) => value ? new Date(value).toLocaleDateString('es-EC') : 'No registrada';
    const money = (value: string) => `$${Number(value).toFixed(2)}`;
    const line = (label: string, value: string) => { this.ensure(doc, 18); const y = doc.y; doc.font('Helvetica-Bold').fontSize(9).fillColor('#1b4e75').text(label, 46, y, { continued: true }); doc.font('Helvetica').fillColor('#26364a').text(` ${value}`); doc.x = 46; };
    const section = (title: string) => { this.ensure(doc, 30); doc.moveDown(.7).font('Helvetica-Bold').fontSize(12).fillColor('#0b4f82').text(title); doc.moveTo(46, doc.y + 4).lineTo(549, doc.y + 4).strokeColor('#f28c28').stroke(); doc.moveDown(.45); };
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0b4f82').text('MANAGIX');
    doc.fontSize(10).fillColor('#52677a').text('Instituto Superior Yavirac - Diseño de Modas');
    doc.moveDown(.8).fontSize(17).fillColor('#f28c28').text('ORDEN DE PRODUCCIÓN'); doc.moveDown(.3);
    line('Código de orden:', data.codigo); line('Proyecto:', data.proyecto); line('Estudiante:', data.estudiante); line('Tipo de prenda:', data.prenda); line('Versión de costeo:', `V${data.version}`); line('Estado:', data.estado); line('Fecha de creación:', date(data.createdAt)); line('Fecha de inicio:', date(data.fechaInicio)); if (data.fechaFin) line('Fecha de finalización:', date(data.fechaFin));
    const completadas = data.estado === 'FINALIZADA' ? data.etapas.length : data.etapas.filter(e => e.estado === 'COMPLETADA').length;
    const progreso = data.etapas.length ? Math.round(completadas * 100 / data.etapas.length) : 0;
    line('Progreso:', `${completadas} de ${data.etapas.length} etapas completadas (${progreso} %)`);
    const actual = data.etapas.find(e => e.estado === 'EN_PROCESO'); if (actual) line('Etapa actual:', actual.nombre);
    section('RESUMEN DE COSTEO'); line('Subtotal materiales:', money(data.resumen.subtotalMateriales)); line('Mano de obra:', money(data.resumen.valorManoObra)); line('Ganancia:', money(data.resumen.valorGanancia)); line('Total estimado:', money(data.resumen.total));
    this.ensure(doc, 36); doc.moveDown(.4).font('Helvetica-Oblique').fontSize(8.5).fillColor('#52677a').text('Los valores corresponden a una estimación académica registrada en MANAGIX.');
    section('ETAPAS DE PRODUCCIÓN');
    for (const etapa of data.etapas) {
      this.ensure(doc, 85); const y = doc.y; doc.rect(46, y, 503, 20).fillAndStroke('#0b4f82', '#0b4f82'); doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(`${etapa.orden}. ${etapa.codigo} - ${etapa.nombre}`, 52, y + 5, { width: 490, ellipsis: true }); doc.y = y + 25;
      line('Estado productivo:', etapa.estado); line('Inicio:', date(etapa.inicio)); line('Fin:', date(etapa.fin)); line('Evidencias:', String(etapa.evidencias)); if (etapa.observacion) line('Observación del estudiante:', etapa.observacion);
      if (etapa.revision) { line('Última revisión docente:', etapa.revision.resultado); line('Docente:', etapa.revision.docente); line('Fecha de revisión:', date(etapa.revision.fecha)); if (etapa.revision.observacion) line('Observación docente:', etapa.revision.observacion); } else line('Última revisión docente:', 'SIN REVISAR');
      doc.moveDown(.25);
    }
    this.ensure(doc, 42); doc.moveDown(1).font('Helvetica-Oblique').fontSize(8.5).fillColor('#52677a').text('Documento generado por MANAGIX con fines académicos para el seguimiento del proceso de producción en la carrera de Diseño de Modas.', { align: 'center' });
    doc.end(); return fin;
  }
  private ensure(doc: PDFKit.PDFDocument, height: number): void { if (doc.y + height > doc.page.height - 46) doc.addPage(); }
}
