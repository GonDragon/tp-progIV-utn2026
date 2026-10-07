import { Component, EventEmitter, Output, input } from '@angular/core';
import { TicketDetails } from '../../../../../../models/ticket';

@Component({
  selector: 'app-ticket-details-card',
  standalone: true,
  templateUrl: './ticket-details-card.html'
})
export class TicketDetailsCard {
  ticket = input.required<TicketDetails>();
  isProcessing = input<boolean>(false);

  @Output() useTicket = new EventEmitter<void>();
  @Output() refundTicket = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'No especificado';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }
}
