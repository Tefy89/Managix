import { calcularCostoFinal } from './final-costeo.calculator';

describe('calcularCostoFinal', () => {
  it('produce PVP 46.00 para el caso académico controlado', () => {
    expect(calcularCostoFinal({ tiempoEstandar: 50, costoMinutoMod: .10, costoMinutoMoi: .05, costoMinutoGenerales: .03, costoMinutoPatronajeCorte: .02, costoMinutoDiseno: .04, subtotalMateriales: 20, porcentajeUtilidad: 25, porcentajeIva: 15 })).toMatchObject({ mod: 5, moi: 2.5, generales: 1.5, patronajeCorte: 1, diseno: 2, costoUnitario: 32, utilidad: 8, subtotalVenta: 40, porcentajeIva: 15, iva: 6, pvp: 46 });
  });
});
