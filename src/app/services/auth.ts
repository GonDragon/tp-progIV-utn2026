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

  async register(params: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    tipo_sangre?: string;
    color_ojos?: string;
    dias_vacaciones?: number;
  }): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const email = params.email.trim().toLowerCase();
      const password = params.password;

      const { data, error } = await this.supabaseService.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: params.nombre.trim(),
            apellido: params.apellido.trim(),
            rol: 'cliente',
            fecha_nacimiento: params.fecha_nacimiento || null,
            tipo_sangre: params.tipo_sangre || null,
            color_ojos: params.color_ojos || null,
            dias_vacaciones: params.dias_vacaciones !== undefined ? Number(params.dias_vacaciones) : 0
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const userId = data.user?.id;
      if (!userId) {
        return { success: false, error: 'No se pudo crear la cuenta de usuario.' };
      }

      const profilePayload = {
        id: userId,
        email: email,
        nombre: params.nombre.trim(),
        apellido: params.apellido.trim(),
        fecha_nacimiento: params.fecha_nacimiento || null,
        tipo_sangre: params.tipo_sangre || null,
        color_ojos: params.color_ojos || null,
        dias_vacaciones: params.dias_vacaciones !== undefined ? Number(params.dias_vacaciones) : 0,
        rol: 'cliente' as const,
        puntos_fidelidad: 0,
        saldo_favor: 0.00
      };

      const { error: profileError } = await this.supabaseService.client
        .from('perfiles')
        .upsert(profilePayload);

      if (profileError) {
        console.warn('Error al guardar datos en la tabla perfiles:', profileError.message);
      }

      try {
        await this.supabaseService.client.from('log_actividad').insert({
          perfil_id: userId,
          accion: `Registro de nuevo cliente: ${params.nombre.trim()} ${params.apellido.trim()} (${email})`
        });
      } catch {
        // non-blocking
      }

      const userProfile: User = {
        ...profilePayload,
        created_at: new Date().toISOString()
      };

      this._currentUser.set(userProfile);

      return { success: true, user: userProfile };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error inesperado durante el registro' };
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

  updateLocalUser(partial: Partial<User>): void {
    const current = this._currentUser();
    if (current) {
      this._currentUser.set({ ...current, ...partial });
    }
  }

  async refreshCurrentUser(): Promise<void> {
    const current = this._currentUser();
    if (current?.id) {
      const updated = await this.fetchUserProfile(current.id, current.email);
      this._currentUser.set(updated);
    }
  }

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }
}
