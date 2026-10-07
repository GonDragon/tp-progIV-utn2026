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
    if (url.includes('registro') || url.includes('register')) {
      return 'Registro de Cliente';
    }
    if (url.includes('busqueda') || url.includes('buscar') || url.includes('search')) {
      return 'Búsqueda de Películas';
    }
    if (url.includes('perfil') || url.includes('profile')) {
      return 'Mi Perfil';
    }
    return 'Cartelera y Funciones de CineIV';
  });

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/registro']);
  }

  logout(): void {
    this.authService.logout();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToSearch(): void {
    this.router.navigate(['/busqueda']);
  }

  goToProfile(): void {
    const user = this.authService.currentUser();
    if (user && user.rol === 'cliente') {
      this.router.navigate(['/perfil']);
    } else if (!user) {
      this.router.navigate(['/login']);
    }
  }
}
