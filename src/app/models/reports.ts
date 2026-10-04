export interface DailyReportItem {
  date: string; // YYYY-MM-DD
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

export interface CandySalesStat {
  id: string | number;
  name: string;
  category: string;
  salesCount: number;
  totalIncome: number;
  percentage: number;
}

export interface ReportKpiSummary {
  totalIncome: number;
  totalTickets: number;
  totalCandy: number;
  averageTicketsPerDay: number;
  candyAttachmentRate: number; // percentage of transactions with candy
  growthPercentage: number;
  totalTransactionsCount: number;
}

export type ReportTimeframe = '7d' | '14d' | '30d' | 'all';

export interface SaleTransactionPayload {
  perfilId?: string | null;
  cuponId?: number | null;
  tickets: Array<{
    funcionId: number;
    butacaId?: number;
    precio: number;
  }>;
  candyItems: Array<{
    productoId?: number | null;
    comboId?: number | null;
    cantidad: number;
    precioUnitario: number;
  }>;
}
