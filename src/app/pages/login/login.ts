import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = signal('');
  password = signal('');
  errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/']);
      }
    });
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    const emailVal = this.email().trim();
    const passwordVal = this.password();

    if (!emailVal || !passwordVal) {
      this.errorMessage.set('Por favor complete todos los campos.');
      return;
    }

    const success = this.authService.login(emailVal, passwordVal);
    if (success) {
      const user = this.authService.currentUser();
      if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/']);
      }
    } else {
      this.errorMessage.set('Credenciales inválidas. Por favor intente nuevamente.');
    }
  }
}
