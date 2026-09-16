export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'cliente' | 'empleado' | 'administrador';
}

export interface AuthSession {
  token: string;
  user: User;
}
