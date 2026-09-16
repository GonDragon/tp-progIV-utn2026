import { Component, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!this.authService.isAuthenticated() || !user || (user.rol !== 'administrador' && user.rol !== 'empleado')) {
        this.router.navigate(['/']);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
