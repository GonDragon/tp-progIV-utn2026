export type SeatType = 'Normal' | 'Discapacidad' | 'VIP';

export interface Seat {
  id: number;
  salaId: number;
  fila: string;      // 'A' .. 'T'
  columna: number;   // 1 .. 28 (or 1 .. 14 for J and K)
  tipo: SeatType;
  code: string;      // e.g. "A1", "J5", "R12"
  isReserved?: boolean;
}

export interface SalaRowLayout {
  fila: string;
  tipo: SeatType;
  col1Count: number;
  col2Count: number;
  col3Count: number;
  totalSeats: number;
}
