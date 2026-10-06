import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  imports: [RouterOutlet],
  selector: 'app-layout',
  standalone: true,
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      }
    });
  }

  readonly sectionTitle = computed(() => {
    const url = this.currentUrl();
    if (url.includes('dashboard')) {
      return 'Panel Administrativo';
    }
    if (url.includes('login')) {
      return 'Iniciar Sesión';
    }
    return 'Cartelera y Funciones de CineIV';
  });

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToSearch(): void {
    this.router.navigate(['/']).then(() => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLElement;
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  goToProfile(): void {
    const user = this.authService.currentUser();
    if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
      this.router.navigate(['/dashboard']);
    } else if (!user) {
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
