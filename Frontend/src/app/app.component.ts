import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacionDialogoComponent } from './shared/components/confirmacion-dialogo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmacionDialogoComponent],
  template: `<router-outlet></router-outlet><app-confirmacion-dialogo />`,
  styles: [`:host { display: block; height: 100%; }`],
})
export class AppComponent {
  title = 'MANAGIX';
}
