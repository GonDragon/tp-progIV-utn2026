import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../../../services/reports.service';
import { ReportTimeframe, SaleTransactionPayload } from '../../../../models/reports';
import { ReportHeader } from './components/report-header/report-header';
import { ReportKpis } from './components/report-kpis/report-kpis';
import { ReportMovieStats } from './components/report-movie-stats/report-movie-stats';
import { ReportCandyStats } from './components/report-candy-stats/report-candy-stats';
import { ReportDailyTable } from './components/report-daily-table/report-daily-table';
import { QuickSaleModal } from './components/quick-sale-modal/quick-sale-modal';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReportHeader,
    ReportKpis,
    ReportMovieStats,
    ReportCandyStats,
    ReportDailyTable,
    QuickSaleModal
  ],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.css'
})
export class AdminReports {
  readonly reportsService = inject(ReportsService);

  readonly isQuickSaleModalOpen = signal(false);
  readonly isSavingSale = signal(false);

  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimer: any = null;

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 4500);
  }

  onTimeframeChange(tf: ReportTimeframe): void {
    this.reportsService.setTimeframe(tf);
  }

  onMovieChartTimeframeChange(tf: 'weekly' | 'monthly'): void {
    this.reportsService.setMovieChartTimeframe(tf);
  }

  async onRefresh(): Promise<void> {
    await this.reportsService.loadReportsData();
    this.showToast('Datos de reportes actualizados desde Supabase.');
  }

  async onExportExcel(): Promise<void> {
    await this.reportsService.exportDailyReportToExcel();
    this.showToast('Reporte exportado a Excel (.xls) y registrado en log de actividad.');
  }

  async onExportCsv(): Promise<void> {
    await this.reportsService.exportDailyReportToCsv();
    this.showToast('Reporte exportado a CSV y registrado en log de actividad.');
  }

  async onExportPdf(): Promise<void> {
    await this.reportsService.printOrDownloadPdf();
  }

  openQuickSaleModal(): void {
    this.isQuickSaleModalOpen.set(true);
  }

  closeQuickSaleModal(): void {
    this.isQuickSaleModalOpen.set(false);
  }

  async onSaveSale(payload: SaleTransactionPayload): Promise<void> {
    this.isSavingSale.set(true);
    const result = await this.reportsService.createSaleTransaction(payload);
    this.isSavingSale.set(false);

    if (result.success) {
      this.closeQuickSaleModal();
      this.showToast(result.message, 'success');
    } else {
      this.showToast(result.message || 'Error al persistir la venta.', 'error');
    }
  }
}
