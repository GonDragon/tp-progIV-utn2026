import { Component, inject, signal } from '@angular/core';
import { TicketService } from '../../../../services/ticket.service';
import { ValidationHeader } from './components/validation-header/validation-header';
import { QrScanner } from './components/qr-scanner/qr-scanner';
import { ManualCodeInput } from './components/manual-code-input/manual-code-input';
import { TicketDetailsCard } from './components/ticket-details-card/ticket-details-card';

@Component({
  selector: 'app-admin-validation',
  standalone: true,
  imports: [
    ValidationHeader,
    QrScanner,
    ManualCodeInput,
    TicketDetailsCard
  ],
  templateUrl: './admin-validation.html',
  styleUrl: './admin-validation.css'
})
export class AdminValidation {
  readonly ticketService = inject(TicketService);

  readonly currentTicket = this.ticketService.currentTicket;
  readonly isLoading = this.ticketService.isLoading;
  readonly error = this.ticketService.error;

  cameraActive = signal<boolean>(false);
  feedback = signal<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  onCameraStateChange(active: boolean): void {
    this.cameraActive.set(active);
  }

  async handleCodeValidation(code: string): Promise<void> {
    this.feedback.set(null);
    const result = await this.ticketService.getTicketByQrCode(code);

    if (!result.success) {
      this.feedback.set({
        type: 'error',
        message: result.message
      });
    } else if (result.ticket?.isUsed) {
      this.feedback.set({
        type: 'warning',
        message: 'Atención: Este boleto ya fue consumido previamente.'
      });
    } else {
      this.feedback.set({
        type: 'success',
        message: '¡Boleto válido encontrado! Revisa los datos a continuación.'
      });
    }
  }

  async handleUseTicket(): Promise<void> {
    const ticket = this.currentTicket();
    if (!ticket) return;

    this.feedback.set(null);
    const result = await this.ticketService.useTicket(ticket.id);

    if (result.success) {
      this.feedback.set({
        type: 'success',
        message: result.message
      });
    } else {
      this.feedback.set({
        type: 'error',
        message: result.message
      });
    }
  }

  async handleRefundTicket(): Promise<void> {
    const ticket = this.currentTicket();
    if (!ticket) return;

    this.feedback.set(null);
    const result = await this.ticketService.refundTicket(ticket.id);

    if (result.success) {
      this.feedback.set({
        type: 'success',
        message: result.message
      });
    } else {
      this.feedback.set({
        type: 'error',
        message: result.message
      });
    }
  }

  handleGoBack(): void {
    this.ticketService.clearCurrentTicket();
    this.feedback.set(null);
  }

  dismissFeedback(): void {
    this.feedback.set(null);
  }
}
