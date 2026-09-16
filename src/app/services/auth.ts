import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User, AuthSession } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly STORAGE_KEY = 'mock_auth_token';

  // Base de datos simulada de usuarios
  private readonly mockUsers = [
    {
      user: { id: '1', email: 'admin@example.com', nombre: 'Admin', apellido: 'Adminincio', rol: 'administrador' as const },
      password: 'admin123'
    },
    {
      user: { id: '2', email: 'empleado@example.com', nombre: 'Empleado', apellido: 'Empleadinho', rol: 'empleado' as const },
      password: 'emp123'
    },
    {
      user: { id: '3', email: 'cliente@example.com', nombre: 'Billete', apellido: 'Billetin', rol: 'cliente' as const },
      password: 'cli123'
    }
  ];

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.checkStoredSession();
  }

  login(email: string, pass: string): boolean {

    // Aca usar la función de SupaBase para iniciar sesión
    const foundAccount = this.mockUsers.find(
      u => u.user.email.toLowerCase() === email.toLowerCase() && u.password === pass
    );

    if (foundAccount) {
      const mockSession: AuthSession = {
        token: `mock-jwt-token-${foundAccount.user.id}-${Date.now()}`,
        user: foundAccount.user
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mockSession));
      this._currentUser.set(foundAccount.user);
      return true;
    }

    return false;
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/']);
  }

  private checkStoredSession(): void {
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (rawData) {
      try {
        const session: AuthSession = JSON.parse(rawData);
        this._currentUser.set(session.user);
      } catch {
        this.logout();
      }
    }
  }

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }
}
