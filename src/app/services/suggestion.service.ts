import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { MovieSuggestion, CreateSuggestionDto } from '../models/movie-suggestion';

@Injectable({
  providedIn: 'root'
})
export class SuggestionService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la sugerencia pendiente (sin revisar) de un usuario específico, si existe.
   */
  async getPendingSuggestionByUser(userId: string): Promise<{ data: MovieSuggestion | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.client
        .from('sugerencia_pelicula')
        .select('*')
        .eq('perfil_id', userId)
        .eq('revisado', false)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching pending suggestion for user:', error.message);
        return { data: null, error: error.message };
      }

      return { data: data as MovieSuggestion | null, error: null };
    } catch (err: any) {
      console.error('Error al obtener sugerencia pendiente del usuario:', err);
      return { data: null, error: err.message || 'Error al obtener la sugerencia' };
    }
  }

  /**
   * Envía una nueva sugerencia de película.
   */
  async createSuggestion(dto: CreateSuggestionDto): Promise<{ success: boolean; data?: MovieSuggestion; error?: string }> {
    try {
      if (!dto.titulo || !dto.titulo.trim()) {
        return { success: false, error: 'Debes ingresar un título para la película.' };
      }
      if (!dto.descripcion || !dto.descripcion.trim()) {
        return { success: false, error: 'Debes ingresar una descripción de la película.' };
      }
      if (!dto.explicacion_cine || !dto.explicacion_cine.trim()) {
        return { success: false, error: 'Debes explicar por qué quieres esta película en el cine.' };
      }

      const { data, error } = await this.supabase.client
        .from('sugerencia_pelicula')
        .insert({
          perfil_id: dto.perfil_id,
          titulo: dto.titulo.trim(),
          descripcion: dto.descripcion.trim(),
          explicacion_cine: dto.explicacion_cine.trim(),
          revisado: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating suggestion:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as MovieSuggestion };
    } catch (err: any) {
      console.error('Error al crear sugerencia de película:', err);
      return { success: false, error: err.message || 'Error al enviar la sugerencia' };
    }
  }

  /**
   * Obtiene todas las sugerencias pendientes (sin revisar) para el administrador.
   */
  async getPendingSuggestions(): Promise<{ data: MovieSuggestion[]; error: string | null }> {
    try {
      const { data, error } = await this.supabase.client
        .from('sugerencia_pelicula')
        .select(`
          id,
          perfil_id,
          titulo,
          descripcion,
          explicacion_cine,
          revisado,
          created_at,
          perfiles:perfil_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('revisado', false)
        .order('id', { ascending: false });

      if (error) {
        console.warn('Error fetching pending suggestions:', error.message);
        return { data: [], error: error.message };
      }

      const suggestions: MovieSuggestion[] = (data || []).map((row: any) => ({
        id: row.id,
        perfil_id: row.perfil_id,
        titulo: row.titulo,
        descripcion: row.descripcion,
        explicacion_cine: row.explicacion_cine,
        revisado: row.revisado,
        created_at: row.created_at,
        perfiles: Array.isArray(row.perfiles) ? row.perfiles[0] : row.perfiles
      }));

      return { data: suggestions, error: null };
    } catch (err: any) {
      console.error('Error al obtener sugerencias pendientes:', err);
      return { data: [], error: err.message || 'Error al obtener sugerencias' };
    }
  }

  /**
   * Marca una sugerencia como revisada.
   */
  async markAsReviewed(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.client
        .from('sugerencia_pelicula')
        .update({ revisado: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking suggestion as reviewed:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error al marcar sugerencia como revisada:', err);
      return { success: false, error: err.message || 'Error al actualizar la sugerencia' };
    }
  }
}
