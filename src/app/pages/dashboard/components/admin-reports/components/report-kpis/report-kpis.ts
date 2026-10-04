import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportKpiSummary, ReportTimeframe } from '../../../../../../models/reports';

@Component({
  selector: 'app-report-kpis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-kpis.html',
  styleUrl: './report-kpis.css'
})
export class ReportKpis {
  readonly summary = input.required<ReportKpiSummary>();
  readonly timeframe = input.required<ReportTimeframe>();

  getTimeframeLabel(): string {
    switch (this.timeframe()) {
      case '7d': return '7 DÍAS';
      case '14d': return '14 DÍAS';
      case '30d': return '30 DÍAS';
      case 'all': return 'HISTÓRICO';
      default: return 'PERÍODO';
    }
  }
}
