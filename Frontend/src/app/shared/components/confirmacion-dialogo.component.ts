import { Component, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ConfirmacionService } from '../../core/services/confirmacion.service';

@Component({
  selector: 'app-confirmacion-dialogo',
  standalone: true,
  imports: [NgIf, AsyncPipe],
  template: `
    <section *ngIf="confirmacion.solicitud$ | async as solicitud" class="backdrop" role="presentation" (click)="responder(false)">
      <div class="dialogo" role="alertdialog" aria-modal="true" [attr.aria-label]="solicitud.titulo" (click)="$event.stopPropagation()">
        <h2>{{ solicitud.titulo }}</h2>
        <p>{{ solicitud.mensaje }}</p>
        <div class="acciones">
          <button type="button" class="secundario" (click)="responder(false)">Cancelar</button>
          <button type="button" class="primario" (click)="responder(true)">{{ solicitud.confirmar }}</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .backdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:20px;background:rgb(15 23 42 / 56%);backdrop-filter:blur(3px)}
    .dialogo{width:min(100%,460px);max-height:calc(100dvh - 40px);overflow:auto;padding:26px;border:1px solid var(--color-border);border-radius:var(--radius-lg);background:#fff;box-shadow:var(--shadow-modal)}
    h2{margin:0 0 10px;color:var(--color-azul,#0b4f82);font-size:1.2rem}.dialogo p{margin:0;color:#405365;line-height:1.55}.acciones{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.acciones button{min-height:42px;border:0;border-radius:9px;padding:9px 15px;font:inherit;font-weight:700;cursor:pointer}.secundario{background:#edf2f6;color:#24445e}.primario{background:var(--color-naranja);color:#fff}.primario:hover{background:var(--color-naranja-dark)}@media(max-width:480px){.backdrop{padding:14px}.dialogo{padding:20px}.acciones{flex-direction:column-reverse}.acciones button{width:100%}}
  `],
})
export class ConfirmacionDialogoComponent {
  readonly confirmacion = inject(ConfirmacionService);
  responder(aceptada: boolean): void { this.confirmacion.responder(aceptada); }
}