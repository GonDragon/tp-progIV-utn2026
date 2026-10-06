export interface CandyProduct {
  id: string;
  name: string;
  category: 'Pochoclos' | 'Bebidas' | 'Snacks' | 'Dulces' | 'Combos' | string;
  price: number;
  pointsCost: number; // Cost in loyalty points to redeem
  description?: string;
  placeholderColor?: string;
  isAvailable?: boolean;
  salesCount: number;
}

export interface SpecialCombo {
  id: string;
  name: string;
  description?: string;
  ticketCount?: number;
  includedItems?: string[]; // e.g. ["1x Balde Pochoclos Grande", "2x Gaseosa 750ml"]
  fixedPrice: number;
  pointsCost?: number;
  isActive?: boolean;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  discountPercent: number;
  type: 'primera_compra' | 'mayores_50' | 'general' | 'especial';
  minAge?: number;
  isActive: boolean;
  description: string;
  usageCount: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  type: 'ticket' | 'candy' | 'combo';
  pointsCost: number;
  description: string;
  isActive: boolean;
}

export type { AuditLogEntry, LogActividadDB, AuditActionType, AuditStats } from './audit';

export interface ValidatableTicket {
  id: string;
  code: string; // e.g. "TKT-89214"
  movieTitle: string;
  scheduleTime: string;
  room: string;
  format: string;
  seats: string[];
  candyItems: string[];
  customerName: string;
  customerEmail: string;
  purchaseDate: string;
  totalPaid: number;
  status: 'valida' | 'utilizada' | 'cancelada';
  validatedAt?: string;
  validatedBy?: string;
}

export interface DailyReportItem {
  date: string;
  ticketsCount: number;
  candyCount: number;
  ticketsIncome: number;
  candyIncome: number;
  totalIncome: number;
}

export interface MovieViewStat {
  movieId: string;
  movieTitle: string;
  viewsWeekly: number;
  viewsMonthly: number;
  ticketsSoldWeekly: number;
  ticketsSoldMonthly: number;
  percentageWeekly: number;
  percentageMonthly: number;
}

export interface RoomScheduleSlot {
  roomName: string;
  startTime: string; // "14:00"
  endTime: string;   // "16:45" (duration + 30 min buffer)
  movieTitle: string;
  movieId: string;
}
