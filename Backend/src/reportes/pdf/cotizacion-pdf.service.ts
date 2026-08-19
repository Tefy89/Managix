import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface CotizacionPdfData {
  proyecto: string; estudiante: string; prenda: string; version: number; fecha: Date;
  medidas: Array<{ nombre: string; valor: string; unidad: string }>;
  telas: Array<{ nombre: string; cantidad: string; sugerida: string | null; precio: string; subtotal: string }>;
  insumos: Array<{ nombre: string; cantidad: string; unidad: string; precio: string; subtotal: string }>;
  resumen: { subtotalTelas: string; subtotalInsumos: string; subtotalMateriales: string; porcentajeManoObra: string; valorManoObra: string; porcentajeGanancia: string; valorGanancia: string; total: string };
}
@Injectable()
export class CotizacionPdfService {
  async generar(data: CotizacionPdfData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 48, compress: false, info: { Title: 'Cotización académica MANAGIX', Author: 'MANAGIX' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
    const money = (value: string) => `$${Number(value).toFixed(2)}`;
    const line = (label: string, value: string) => { this.ensure(doc, 20); const y = doc.y; doc.font('Helvetica-Bold').fontSize(9).fillColor('#1b4e75').text(label, 48, y, { continued: true }); doc.font('Helvetica').fillColor('#26364a').text(` ${value}`); doc.x = 48; };
    const section = (title: string) => { this.ensure(doc, 32); doc.moveDown(.7).font('Helvetica-Bold').fontSize(12).fillColor('#0b4f82').text(title); doc.moveTo(48, doc.y + 4).lineTo(547, doc.y + 4).strokeColor('#f28c28').stroke(); doc.moveDown(.5); };
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0b4f82').text('MANAGIX');
    doc.fontSize(10).fillColor('#52677a').text('Instituto Superior Yavirac - Diseño de Modas');
    doc.moveDown(.8).fontSize(17).fillColor('#f28c28').text('COTIZACIÓN ACADÉMICA');
    doc.moveDown(.4); line('Proyecto:', data.proyecto); line('Estudiante:', data.estudiante); line('Tipo de prenda:', data.prenda); line('Versión:', `V${data.version}`); line('Fecha de generación:', data.fecha.toLocaleDateString('es-EC'));
    section('MEDIDAS'); this.table(doc, ['Medida', 'Valor', 'Unidad'], data.medidas.map(x => [x.nombre, x.valor, x.unidad]));
    section('TELAS'); this.table(doc, ['Tela', 'Cantidad', 'Sugerida', 'Precio aplicado', 'Subtotal'], data.telas.map(x => [x.nombre, x.cantidad, x.sugerida === null ? 'No disponible' : x.sugerida, money(x.precio), money(x.subtotal)]));
    section('INSUMOS'); this.table(doc, ['Insumo', 'Cantidad', 'Unidad', 'Precio aplicado', 'Subtotal'], data.insumos.map(x => [x.nombre, x.cantidad, x.unidad, money(x.precio), money(x.subtotal)]));
    section('RESUMEN DE COSTEO');
    [['Subtotal telas', money(data.resumen.subtotalTelas)], ['Subtotal insumos', money(data.resumen.subtotalInsumos)], ['Subtotal materiales', money(data.resumen.subtotalMateriales)], [`Mano de obra (${Number(data.resumen.porcentajeManoObra).toFixed(2)}%)`, money(data.resumen.valorManoObra)], [`Ganancia (${Number(data.resumen.porcentajeGanancia).toFixed(2)}%)`, money(data.resumen.valorGanancia)]].forEach(([label, value]) => line(`${label}:`, value));
    this.ensure(doc, 28); doc.moveDown(.4).font('Helvetica-Bold').fontSize(14).fillColor('#0b4f82').text(`TOTAL COSTEO: ${money(data.resumen.total)}`);
    this.ensure(doc, 54); doc.moveDown(1.4).font('Helvetica-Oblique').fontSize(8.5).fillColor('#52677a').text('Los valores presentados corresponden a un ejercicio académico y se utilizan con fines educativos dentro de MANAGIX.', { align: 'center' });
    doc.end(); return finished;
  }
  private ensure(doc: PDFKit.PDFDocument, height: number): void { if (doc.y + height > doc.page.height - 48) doc.addPage(); }
  private table(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]): void {
    const width = 499; const col = width / headers.length; const draw = (values: string[], header = false) => { this.ensure(doc, 25); const y = doc.y; doc.rect(48, y, width, 24).fillAndStroke(header ? '#0b4f82' : '#f6f9fc', '#d8e2eb'); values.forEach((value, index) => doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(header ? 8 : 7.5).fillColor(header ? '#ffffff' : '#26364a').text(value, 48 + index * col + 4, y + 5, { width: col - 8, height: 22, ellipsis: true })); doc.y = y + 24; };
    draw(headers, true); if (!rows.length) draw(['Sin registros disponibles'], false); else rows.forEach(row => draw(row, false));
  }
}
