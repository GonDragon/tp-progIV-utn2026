import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Review, CreateReviewDto } from '../models/review';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene todas las reseñas de una película dada, con los datos del perfil asociado.
   */
  async getReviewsByMovie(movieId: number | string): Promise<{ data: Review[]; error: string | null }> {
    try {
      const numericId = typeof movieId === 'string' ? parseInt(movieId, 10) : movieId;
      const { data, error } = await this.supabase.client
        .from('resenas')
        .select(`
          id,
          pelicula_id,
          perfil_id,
          calificacion,
          comentario,
          fecha_creacion,
          perfiles:perfil_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('pelicula_id', numericId)
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.warn('Error fetching reviews:', error.message);
        return { data: [], error: error.message };
      }

      const reviews: Review[] = (data || []).map((row: any) => ({
        id: row.id,
        pelicula_id: row.pelicula_id,
        perfil_id: row.perfil_id,
        calificacion: Number(row.calificacion),
        comentario: row.comentario || '',
        fecha_creacion: row.fecha_creacion,
        perfiles: Array.isArray(row.perfiles) ? row.perfiles[0] : row.perfiles
      }));

      return { data: reviews, error: null };
    } catch (err: any) {
      console.error('Error al obtener reseñas de la película:', err);
      return { data: [], error: err.message || 'Error al obtener reseñas' };
    }
  }

  /**
   * Obtiene los IDs de las películas que el usuario ya ha reseñado.
   */
  async getUserReviewedMovieIds(userId: string): Promise<Set<number>> {
    try {
      const { data, error } = await this.supabase.client
        .from('resenas')
        .select('pelicula_id')
        .eq('perfil_id', userId);

      if (error) {
        console.warn('Error fetching user reviewed movie IDs:', error.message);
        return new Set();
      }

      const ids = new Set<number>();
      for (const row of (data || [])) {
        if (row.pelicula_id != null) {
          ids.add(Number(row.pelicula_id));
        }
      }
      return ids;
    } catch (err) {
      console.warn('Error al verificar reseñas del usuario:', err);
      return new Set();
    }
  }

  /**
   * Inserta una nueva reseña en la tabla 'resenas'.
   */
  async addReview(dto: CreateReviewDto): Promise<{ success: boolean; review?: Review; error?: string }> {
    try {
      // Validaciones básicas
      if (!dto.pelicula_id || !dto.perfil_id) {
        return { success: false, error: 'Faltan datos de la película o el usuario.' };
      }
      if (!dto.calificacion || dto.calificacion < 1 || dto.calificacion > 5) {
        return { success: false, error: 'La calificación debe ser un valor entre 1 y 5.' };
      }
      if (!dto.comentario || !dto.comentario.trim()) {
        return { success: false, error: 'Debes ingresar un comentario para la reseña.' };
      }

      const { data, error } = await this.supabase.client
        .from('resenas')
        .insert({
          pelicula_id: dto.pelicula_id,
          perfil_id: dto.perfil_id,
          calificacion: Math.round(dto.calificacion),
          comentario: dto.comentario.trim()
        })
        .select(`
          id,
          pelicula_id,
          perfil_id,
          calificacion,
          comentario,
          fecha_creacion,
          perfiles:perfil_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error inserting review:', error.message);
        return { success: false, error: error.message };
      }

      const review: Review = {
        id: data.id,
        pelicula_id: data.pelicula_id,
        perfil_id: data.perfil_id,
        calificacion: Number(data.calificacion),
        comentario: data.comentario,
        fecha_creacion: data.fecha_creacion,
        perfiles: Array.isArray(data.perfiles) ? data.perfiles[0] : data.perfiles
      };

      return { success: true, review };
    } catch (err: any) {
      console.error('Error al guardar reseña:', err);
      return { success: false, error: err.message || 'Error al guardar la reseña' };
    }
  }
}
