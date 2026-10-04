export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'cliente' | 'empleado' | 'administrador';
  fecha_nacimiento?: string;
  tipo_sangre?: string;
  color_ojos?: string;
  dias_vacaciones?: number;
  puntos_fidelidad?: number;
  saldo_favor?: number;
  created_at?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
