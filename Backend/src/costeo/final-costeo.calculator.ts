export type ComponentesCostoFinal = {
  tiempoEstandar: number; costoMinutoMod: number; costoMinutoMoi: number;
  costoMinutoGenerales: number; costoMinutoPatronajeCorte: number;
  costoMinutoDiseno: number; subtotalMateriales: number; porcentajeUtilidad: number; porcentajeIva: number;
};

const precision = (value: number) => Number(value.toFixed(6));

export const calcularCostoFinal = (input: ComponentesCostoFinal) => {
  const mod = input.costoMinutoMod * input.tiempoEstandar;
  const moi = input.costoMinutoMoi * input.tiempoEstandar;
  const generales = input.costoMinutoGenerales * input.tiempoEstandar;
  const patronajeCorte = input.costoMinutoPatronajeCorte * input.tiempoEstandar;
  const diseno = input.costoMinutoDiseno * input.tiempoEstandar;
  const costoUnitario = mod + moi + generales + patronajeCorte + diseno + input.subtotalMateriales;
  const utilidad = costoUnitario * input.porcentajeUtilidad / 100;
  const subtotalVenta = costoUnitario + utilidad;
  const iva = subtotalVenta * input.porcentajeIva / 100;
  return { mod: precision(mod), moi: precision(moi), generales: precision(generales), patronajeCorte: precision(patronajeCorte), diseno: precision(diseno), materiales: precision(input.subtotalMateriales), costoUnitario: precision(costoUnitario), porcentajeIva: input.porcentajeIva, utilidad: precision(utilidad), subtotalVenta: precision(subtotalVenta), iva: precision(iva), pvp: precision(subtotalVenta + iva) };
};
