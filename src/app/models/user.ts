export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'cliente' | 'empleado' | 'administrador';
  fecha_nacimiento?: string | null;
  tipo_sangre?: string | null;
  color_ojos?: string | null;
  dias_vacaciones?: number | null;
  puntos_fidelidad?: number;
  saldo_favor?: number;
  created_at?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
