import { calcularCuadro2Mod } from './calculo-base.calculator';
import { calcularCostoFinal } from './final-costeo.calculator';

describe('calcularCuadro2Mod', () => {
  const comun = {
    totalSalarioMensual: 561.2533333333333,
    semanasMes: 4,
    diasSemana: 5,
    minutosDia: 480,
    eficiencia: 0.8,
  };

  it.each([
    [1, 0.07307986111111112],
    [2, 0.14615972222222223],
    [3, 0.21923958333333337],
  ])('replica costos!F14 con %i operaria(s)', (numeroOperarias, esperado) => {
    const resultado = calcularCuadro2Mod({ ...comun, numeroOperarias });
    expect(resultado.minutosProductivosMes).toBe(7680 * numeroOperarias);
    expect(resultado.costoMinutoMod).toBeCloseTo(esperado, 12);
  });

  it.each([
    [1, 19.151667900745, 3.878212749901, 29.732964415907],
    [2, 18.514733612551, 3.749233556541, 28.744123933485],
    [3, 20.599565817412, 4.171412078026, 31.980825931532],
  ])('propaga Cuadro 2 a costo, IVA y PVP con %i operaria(s)', (numeroOperarias, costoEsperado, ivaEsperado, pvpEsperado) => {
    const cuadro2 = calcularCuadro2Mod({ ...comun, numeroOperarias });
    const minutos = cuadro2.minutosProductivosMes;
    const resultado = calcularCostoFinal({
      tiempoEstandar: 47.15,
      costoMinutoMod: cuadro2.costoMinutoMod,
      costoMinutoMoi: 200 / minutos,
      costoMinutoGenerales: 260 / minutos,
      costoMinutoPatronajeCorte: 150 / minutos,
      costoMinutoDiseno: 720 / minutos,
      subtotalMateriales: 7.540652970189428,
      porcentajeUtilidad: 35,
      porcentajeIva: 15,
    });

    expect(resultado.costoUnitario).toBeCloseTo(costoEsperado, 6);
    expect(resultado.iva).toBeCloseTo(ivaEsperado, 6);
    expect(resultado.pvp).toBeCloseTo(pvpEsperado, 6);
  });
});