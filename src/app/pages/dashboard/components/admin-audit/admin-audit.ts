import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../../services/audit.service';
import { AuditActionType, AuditLogEntry } from '../../../../models/audit';
import { AuditHeader } from './components/audit-header/audit-header';
import { AuditStats } from './components/audit-stats/audit-stats';
import { AuditFilters } from './components/audit-filters/audit-filters';
import { AuditItem } from './components/audit-item/audit-item';
import { AuditModal } from './components/audit-modal/audit-modal';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AuditHeader,
    AuditStats,
    AuditFilters,
    AuditItem,
    AuditModal
  ],
  templateUrl: './admin-audit.html',
  styleUrl: './admin-audit.css'
})
export class AdminAudit {
  readonly auditService = inject(AuditService);

  readonly selectedCategory = signal<string>('todos');
  readonly selectedAction = signal<string>('todos');
  readonly selectedRole = signal<string>('todos');
  readonly searchQuery = signal<string>('');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  // Modal state
  readonly isModalOpen = signal<boolean>(false);
  readonly isSavingManual = signal<boolean>(false);

  // Toast
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimer: any = null;

  readonly visiblePages = computed<number[]>(() => {
    const current = this.auditService.currentPage();
    const total = this.auditService.totalPages();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  readonly filteredLogs = computed<AuditLogEntry[]>(() => {
    const logs = this.auditService.logs();
    const cat = this.selectedCategory().trim().toLowerCase();
    const act = this.selectedAction().trim().toLowerCase();
    const role = this.selectedRole().trim().toLowerCase();
    const query = this.searchQuery().trim().toLowerCase();

    return logs.filter(log => {
      // 1. Category filter
      const matchCat = cat === 'todos' || log.category.toLowerCase() === cat;

      // 2. Action filter
      const matchAction = act === 'todos' || log.action.toLowerCase() === act;

      // 3. Role filter
      const matchRole =
        role === 'todos' ||
        log.userRole.toLowerCase().includes(role) ||
        (role === 'sistema' && (log.userId === 'anon' || log.userName.toLowerCase().includes('sistema')));

      // 4. Query filter
      const matchQuery =
        !query ||
        log.details.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(query)) ||
        log.category.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.timestamp.includes(query) ||
        log.id.includes(query);

      return matchCat && matchAction && matchRole && matchQuery;
    });
  });

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  async reload(): Promise<void> {
    await this.auditService.loadLogs(this.auditService.currentPage(), this.startDate(), this.endDate());
    this.showToast('Registros de auditoría sincronizados con Supabase.');
  }

  async onStartDateChange(date: string): Promise<void> {
    this.startDate.set(date);
    await this.auditService.loadLogs(1, date, this.endDate());
  }

  async onEndDateChange(date: string): Promise<void> {
    this.endDate.set(date);
    await this.auditService.loadLogs(1, this.startDate(), date);
  }

  async setPage(page: number): Promise<void> {
    if (page < 1 || page > this.auditService.totalPages()) return;
    await this.auditService.loadLogs(page, this.startDate(), this.endDate());
  }

  async handleDownloadCSV(): Promise<void> {
    try {
      this.showToast('Obteniendo registros para exportar...');
      const logs = await this.auditService.fetchLogsForExport(this.startDate(), this.endDate());
      if (logs.length === 0) {
        this.showToast('No se encontraron registros en el rango de fechas seleccionado.', 'error');
        return;
      }
      this.auditService.exportToCSV(logs);
      this.showToast(`Se descargaron exitosamente ${logs.length} registros en formato CSV.`);
    } catch (err: any) {
      this.showToast('Error al descargar el archivo CSV.', 'error');
    }
  }

  async handleDownloadXLSX(): Promise<void> {
    try {
      this.showToast('Obteniendo registros para exportar...');
      const logs = await this.auditService.fetchLogsForExport(this.startDate(), this.endDate());
      if (logs.length === 0) {
        this.showToast('No se encontraron registros en el rango de fechas seleccionado.', 'error');
        return;
      }
      this.auditService.exportToXLSX(logs);
      this.showToast(`Se descargaron exitosamente ${logs.length} registros en formato XLSX.`);
    } catch (err: any) {
      this.showToast('Error al descargar el archivo XLSX.', 'error');
    }
  }

  openManualLogModal(): void {
    this.isModalOpen.set(true);
  }

  closeManualLogModal(): void {
    this.isModalOpen.set(false);
  }

  async handleSaveManualLog(data: {
    action: AuditActionType;
    category: string;
    details: string;
  }): Promise<void> {
    this.isSavingManual.set(true);
    const success = await this.auditService.log(data.action, data.category, data.details);
    this.isSavingManual.set(false);

    if (success) {
      this.closeManualLogModal();
      this.showToast('Entrada de auditoría registrada exitosamente en Supabase.');
    } else {
      this.showToast('No se pudo registrar la entrada de auditoría.', 'error');
    }
  }

  async resetFilters(): Promise<void> {
    this.selectedCategory.set('todos');
    this.selectedAction.set('todos');
    this.selectedRole.set('todos');
    this.searchQuery.set('');
    this.startDate.set('');
    this.endDate.set('');
    await this.auditService.loadLogs(1, '', '');
  }
}
