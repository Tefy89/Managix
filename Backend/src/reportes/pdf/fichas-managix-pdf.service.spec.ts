import { FichasManagixPdfService } from './fichas-managix-pdf.service';

describe('FichasManagixPdfService', () => {
  const service = new FichasManagixPdfService();
  const identificacion = { proyecto: 'Proyecto controlado', estudiante: 'Estudiante controlado', prenda: 'Vestido', version: 1, estado: 'BORRADOR', fecha: new Date('2026-08-27T00:00:00.000Z') };
  const secciones = [{ titulo: 'Información', destacado: [['IVA', '15 %']], columnas: ['Concepto', 'Valor'], filas: [{ Concepto: 'Tiempo estándar', Valor: '12.34 min' }] }];
  it.each(['Ficha de Diseño', 'Ficha Técnica', 'Ficha de Orden Operacional', 'Ficha de Costos'])('genera %s como PDF no vacío', async titulo => {
    const pdf = await service.generar(titulo, identificacion, secciones);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});