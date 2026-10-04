import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyReportItem, ReportKpiSummary, ReportTimeframe } from '../../../../../../models/reports';

@Component({
  selector: 'app-report-daily-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-daily-table.html',
  styleUrl: './report-daily-table.css'
})
export class ReportDailyTable {
  readonly dailyReports = input.required<DailyReportItem[]>();
  readonly summary = input.required<ReportKpiSummary>();
  readonly timeframe = input.required<ReportTimeframe>();

  get totalTicketsIncome(): number {
    return this.dailyReports().reduce((acc, r) => acc + r.ticketsIncome, 0);
  }

  get totalCandyIncome(): number {
    return this.dailyReports().reduce((acc, r) => acc + r.candyIncome, 0);
  }

  getTimeframeSubtitle(): string {
    switch (this.timeframe()) {
      case '7d': return 'Últimos 7 días registrados';
      case '14d': return 'Últimos 14 días registrados';
      case '30d': return 'Últimos 30 días registrados';
      case 'all': return 'Histórico total registrado en Supabase';
      default: return 'Detalle por día';
    }
  }
}
