import { Pipe, PipeTransform } from '@angular/core';

export type CategoriaNumeroManagix = 'entero' | 'tecnico' | 'moneda' | 'monedaTecnica' | 'porcentaje' | 'medida' | 'tiempo';

const precision: Record<CategoriaNumeroManagix, number> = {
  entero: 0,
  moneda: 2,
  monedaTecnica: 4,
  porcentaje: 2,
  tecnico: 4,
  medida: 4,
  tiempo: 4,
};

@Pipe({ name: 'numeroManagix', standalone: true })
export class PresentacionNumeroPipe implements PipeTransform {
  transform(valor: string | number | null | undefined, categoria: CategoriaNumeroManagix = 'tecnico'): string {
    const numero = Number(valor ?? 0);
    if (!Number.isFinite(numero)) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision[categoria],
      useGrouping: false,
    }).format(numero);
  }
}
