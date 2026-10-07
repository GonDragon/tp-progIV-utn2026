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
  isLoading = signal(false);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        const user = this.authService.currentUser();
        if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    const emailVal = this.email().trim();
    const passwordVal = this.password();

    if (!emailVal || !passwordVal) {
      this.errorMessage.set('Por favor complete todos los campos.');
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await this.authService.login(emailVal, passwordVal);
      if (result.success) {
        const user = this.authService.currentUser();
        if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      } else {
        this.errorMessage.set(result.error || 'Credenciales inválidas. Por favor intente nuevamente.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al iniciar sesión. Intente nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  fillCredentials(role: 'admin' | 'empleado' | 'cliente'): void {
    this.errorMessage.set(null);
    if (role === 'admin') {
      this.email.set('admin@example.com');
      this.password.set('admin123');
    } else if (role === 'empleado') {
      this.email.set('empleado@example.com');
      this.password.set('emp123');
    } else if (role === 'cliente') {
      this.email.set('cliente@example.com');
      this.password.set('cli123');
    }
  }

  goToRegister(): void {
    this.router.navigate(['/registro']);
  }
}
