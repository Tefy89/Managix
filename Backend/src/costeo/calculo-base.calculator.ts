export type Cuadro2ModInput = {
  totalSalarioMensual: number;
  numeroOperarias: number;
  semanasMes: number;
  diasSemana: number;
  minutosDia: number;
  eficiencia: number;
};

/** Traducción directa de costos!F6, F13 y F14 del Excel de referencia. */
export const calcularCuadro2Mod = (input: Cuadro2ModInput) => {
  const costoMensualMod = input.totalSalarioMensual * input.numeroOperarias;
  const minutosProductivosMes = input.numeroOperarias * input.semanasMes * input.diasSemana * input.minutosDia * input.eficiencia;
  const costoMinutoMod = minutosProductivosMes === 0
    ? 0
    : (costoMensualMod / minutosProductivosMes) * input.numeroOperarias;

  return { costoMensualMod, minutosProductivosMes, costoMinutoMod };
};