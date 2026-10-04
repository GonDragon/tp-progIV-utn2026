import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { SupabaseService } from './supabase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.initSupabaseAuth();
  }

  private async initSupabaseAuth(): Promise<void> {
    try {
      const { data: { session } } = await this.supabaseService.client.auth.getSession();
      if (session?.user) {
        const profile = await this.fetchUserProfile(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata
        );
        this._currentUser.set(profile);
      }
    } catch (e) {
      console.warn('Error al verificar la sesión inicial de Supabase:', e);
    }

    this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.fetchUserProfile(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata
        );
        this._currentUser.set(profile);
      } else {
        this._currentUser.set(null);
      }
    });
  }

  async login(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile = await this.fetchUserProfile(
          data.user.id,
          data.user.email ?? email,
          data.user.user_metadata
        );
        this._currentUser.set(profile);
        return { success: true };
      }

      return { success: false, error: 'No se pudo obtener información del usuario' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error inesperado al iniciar sesión' };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.supabaseService.client.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      this._currentUser.set(null);
      this.router.navigate(['/']);
    }
  }

  async fetchUserProfile(userId: string, email: string = '', userMetadata: Record<string, any> = {}): Promise<User> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id || userId,
          email: data.email || email,
          nombre: data.nombre || userMetadata['nombre'] || '',
          apellido: data.apellido || userMetadata['apellido'] || '',
          rol: (data.rol as 'cliente' | 'empleado' | 'administrador') || (userMetadata['rol'] as any) || 'cliente',
          fecha_nacimiento: data.fecha_nacimiento,
          tipo_sangre: data.tipo_sangre,
          color_ojos: data.color_ojos,
          dias_vacaciones: data.dias_vacaciones,
          puntos_fidelidad: data.puntos_fidelidad ?? 0,
          saldo_favor: data.saldo_favor ?? 0,
          created_at: data.created_at
        };
      }
    } catch (e) {
      console.warn('No se pudo cargar el perfil desde la tabla perfiles:', e);
    }

    return {
      id: userId,
      email: email,
      nombre: userMetadata['nombre'] || email.split('@')[0] || 'Usuario',
      apellido: userMetadata['apellido'] || '',
      rol: (userMetadata['rol'] as 'cliente' | 'empleado' | 'administrador') || 'cliente'
    };
  }

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }
}
