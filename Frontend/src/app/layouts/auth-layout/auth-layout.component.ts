import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-wrap">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .auth-wrap {
      min-height: 100vh;
      background: #F0F4F8;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `],
})
export class AuthLayoutComponent {}
