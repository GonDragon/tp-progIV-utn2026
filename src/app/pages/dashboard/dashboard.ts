import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AdminMovies } from './components/admin-movies/admin-movies';
import { AdminCandy } from './components/admin-candy/admin-candy';
import { AdminPromotions } from './components/admin-promotions/admin-promotions';
import { AdminReports } from './components/admin-reports/admin-reports';
import { AdminAudit } from './components/admin-audit/admin-audit';
import { AdminValidation } from './components/admin-validation/admin-validation';

export type DashboardTab = 'movies' | 'candy' | 'promotions' | 'reports' | 'audit' | 'validation';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AdminMovies,
    AdminCandy,
    AdminPromotions,
    AdminReports,
    AdminAudit,
    AdminValidation
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentTab = signal<DashboardTab>('movies');

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!this.authService.isAuthenticated() || !user || (user.rol !== 'administrador' && user.rol !== 'empleado')) {
        this.router.navigate(['/']);
      } else if (user.rol === 'empleado' && this.currentTab() === 'movies') {
        // Default to QR validation for employees
        this.currentTab.set('validation');
      }
    });
  }

  setTab(tab: DashboardTab): void {
    this.currentTab.set(tab);
  }

  logout(): void {
    this.authService.logout();
  }
}
