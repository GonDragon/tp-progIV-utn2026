import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../../../../services/admin.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.css'
})
export class AdminReports {
  readonly adminService = inject(AdminService);
  readonly Math = Math;

  readonly movieChartTimeframe = signal<'weekly' | 'monthly'>('weekly');

  get totalTicketsPeriod(): number {
    return this.adminService.dailyReports.reduce((sum, r) => sum + r.ticketsCount, 0);
  }

  get totalCandyPeriod(): number {
    return this.adminService.dailyReports.reduce((sum, r) => sum + r.candyCount, 0);
  }

  get totalIncomePeriod(): number {
    return this.adminService.dailyReports.reduce((sum, r) => sum + r.totalIncome, 0);
  }

  exportExcel(): void {
    this.adminService.exportDailyReportToExcel();
  }

  exportCsv(): void {
    this.adminService.exportDailyReportToCsv();
  }

  exportPdf(): void {
    this.adminService.printOrDownloadPdf();
  }
}
