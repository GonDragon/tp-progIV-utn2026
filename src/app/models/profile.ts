export interface UserProfileData {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'cliente' | 'empleado' | 'administrador';
  fecha_nacimiento?: string | null;
  tipo_sangre?: string | null;
  color_ojos?: string | null;
  dias_vacaciones?: number | null;
  puntos_fidelidad: number;
  saldo_favor: number;
  created_at?: string;
}

export interface ActiveTicketItem {
  id: number;
  transaccionId: number;
  codigoQr: string;
  estadoQr: string;
  qrDataUrl?: string;
  movie: {
    id: number;
    title: string;
    synopsis?: string;
    duration?: number;
    posterUrl?: string;
    ageRestriction?: string;
  };
  schedule: {
    id: number;
    time: string;
    dateTimeRaw?: string;
    room: string;
    format: string;
    language: string;
    basePrice: number;
  };
  seat: {
    id: number;
    seatCode: string;
    seatType: string;
    fila: string;
    columna: number;
  };
  transaccion: {
    id: number;
    montoTotal: number;
    fechaCompra: string;
    estado: string;
  };
  customerName: string;
  customerEmail: string;
  candyItems: Array<{ nombre: string; cantidad: number; precio?: number }>;
}

export interface WatchedMovieItem {
  id: number;
  title: string;
  posterUrl: string;
  hasReview?: boolean;
}
