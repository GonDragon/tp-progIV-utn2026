import { Movie, Schedule } from './movie';
import { Seat } from './seat';
import { Coupon } from './coupon';

export interface SelectedCandyItem {
  id: number;
  tipo: 'producto' | 'combo';
  nombre: string;
  categoria?: string;
  precio: number;
  cantidad: number;
}

export interface PurchaseState {
  movie: Movie | null;
  schedule: Schedule | null;
  ticketQuantity: number;
  selectedSeats: Seat[];
  candyItems: SelectedCandyItem[];
  customerName: string;
  customerEmail: string;
  coupon?: Coupon | null;
}

export interface CompletedPurchaseResult {
  transaccionId: number;
  fechaCompra: string;
  montoTotal: number;
  movie: Movie;
  schedule: Schedule;
  tickets: Array<{
    ticketId: number;
    seatCode: string;
    seatType: string;
    qrCode: string;
  }>;
  candyItems: SelectedCandyItem[];
  customerName: string;
  customerEmail: string;
  couponCode?: string;
  discountAmount?: number;
}
