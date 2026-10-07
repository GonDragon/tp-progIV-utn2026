export interface Review {
  id: number;
  pelicula_id: number;
  perfil_id: string;
  calificacion: number;
  comentario: string;
  fecha_creacion?: string;
  perfiles?: {
    id?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
  } | null;
}

export interface CreateReviewDto {
  pelicula_id: number;
  perfil_id: string;
  calificacion: number;
  comentario: string;
}
