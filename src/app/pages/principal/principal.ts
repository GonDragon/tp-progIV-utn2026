import { Component, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-principal',
  standalone: true,
  templateUrl: './principal.html',
  styleUrl: './principal.css',
})
export class Principal {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout();
  }
}
