import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth';
import { ActiveTicketItem } from '../../models/profile';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly selectedQrTicket = signal<ActiveTicketItem | null>(null);
  readonly refundFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly isRefundingId = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfileData();
  }

  canRefundTicket(ticket: ActiveTicketItem): boolean {
    if (!ticket.schedule?.dateTimeRaw) return false;
    const showtime = new Date(ticket.schedule.dateTimeRaw).getTime();
    if (isNaN(showtime)) return false;
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    return (showtime - now) >= twoHoursInMs;
  }

  getRefundDisabledReason(ticket: ActiveTicketItem): string {
    if (!ticket.schedule?.dateTimeRaw) return 'Horario no definido';
    const showtime = new Date(ticket.schedule.dateTimeRaw).getTime();
    if (isNaN(showtime)) return 'Horario inválido';
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    if (showtime - now <= 0) {
      return 'Función ya iniciada';
    }
    if ((showtime - now) < twoHoursInMs) {
      return 'Devolución no disponible (< 2h de la función)';
    }
    return '';
  }

  async onAutoRefund(ticket: ActiveTicketItem, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canRefundTicket(ticket) || this.isRefundingId() !== null) {
      return;
    }

    const confirmRefund = confirm(`¿Deseas solicitar la devolución automática de esta entrada? Se devolverá el total de la transacción ($${ticket.transaccion.montoTotal.toLocaleString('es-AR')}) como saldo a favor en tu cuenta.`);
    if (!confirmRefund) return;

    this.isRefundingId.set(ticket.id);
    this.refundFeedback.set(null);

    try {
      const res = await this.profileService.autoRefundTicket(ticket.id);
      if (res.success) {
        this.refundFeedback.set({
          type: 'success',
          message: res.message
        });
      } else {
        this.refundFeedback.set({
          type: 'error',
          message: res.message
        });
      }
    } finally {
      this.isRefundingId.set(null);
    }
  }

  dismissRefundFeedback(): void {
    this.refundFeedback.set(null);
  }

  async onDownloadPdf(ticket: ActiveTicketItem, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.profileService.downloadTicketPdf(ticket);
  }

  openQrModal(ticket: ActiveTicketItem): void {
    this.selectedQrTicket.set(ticket);
  }

  closeQrModal(): void {
    this.selectedQrTicket.set(null);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'No especificada';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2].substring(0, 2);
        return `${day}/${month}/${year}`;
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatMemberSince(dateStr?: string): string {
    if (!dateStr) return 'Reciente';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    } catch {
      return 'Reciente';
    }
  }
}
