import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmacionSolicitud {
  titulo: string;
  mensaje: string;
  confirmar: string;
  resolver: (aceptada: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  private readonly fuente = new BehaviorSubject<ConfirmacionSolicitud | null>(null);
  readonly solicitud$ = this.fuente.asObservable();

  solicitar(titulo: string, mensaje: string, confirmar = 'Confirmar'): Promise<boolean> {
    return new Promise<boolean>((resolver) => this.fuente.next({ titulo, mensaje, confirmar, resolver }));
  }

  responder(aceptada: boolean): void {
    const solicitud = this.fuente.value;
    if (!solicitud) return;
    this.fuente.next(null);
    solicitud.resolver(aceptada);
  }
}