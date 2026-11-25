export interface MovieSuggestion {
  id: number;
  perfil_id?: string | null;
  titulo: string;
  descripcion: string;
  explicacion_cine: string;
  revisado: boolean;
  created_at?: string;
  perfiles?: {
    id?: string;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
}

export interface CreateSuggestionDto {
  perfil_id: string;
  titulo: string;
  descripcion: string;
  explicacion_cine: string;
}
