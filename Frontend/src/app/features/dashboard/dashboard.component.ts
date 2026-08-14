import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-dashboard', standalone: true, templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.scss'] })
export class DashboardComponent {
  readonly user = inject(AuthService).user;
}

