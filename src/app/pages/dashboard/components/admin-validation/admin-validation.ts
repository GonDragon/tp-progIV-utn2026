import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { ValidatableTicket } from '../../../../models/admin';

@Component({
  selector: 'app-admin-validation',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-validation.html',
  styleUrl: './admin-validation.css'
})
export class AdminValidation {
  readonly adminService = inject(AdminService);

  manualCode = '';
  validationResult = signal<{
    success: boolean;
    message: string;
    ticket?: ValidatableTicket;
  } | null>(null);

  isScanning = signal(false);

  validateManualCode(): void {
    if (!this.manualCode.trim()) return;

    const res = this.adminService.validateTicketByCode(this.manualCode);
    this.validationResult.set(res);
    if (res.success) {
      this.manualCode = '';
    }
  }

  simulateScan(code: string): void {
    this.isScanning.set(true);
    setTimeout(() => {
      this.isScanning.set(false);
      const res = this.adminService.validateTicketByCode(code);
      this.validationResult.set(res);
    }, 600);
  }

  clearResult(): void {
    this.validationResult.set(null);
  }
}
