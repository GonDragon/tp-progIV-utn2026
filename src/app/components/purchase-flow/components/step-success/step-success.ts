import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompletedPurchaseResult } from '../../../../models/purchase';
import { PdfService } from '../../../../services/pdf.service';

@Component({
  selector: 'app-step-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-success.html'
})
export class StepSuccess implements OnInit {
  private readonly pdfService = inject(PdfService);

  readonly result = input.required<CompletedPurchaseResult>();
  readonly finish = output<void>();

  readonly qrDataUrls = signal<Map<number, string>>(new Map());
  readonly isGeneratingPdf = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    await this.generateQrs();
  }

  async generateQrs(): Promise<void> {
    const QRCode = await import('qrcode');
    const map = new Map<number, string>();
    const tickets = this.result().tickets;

    for (const t of tickets) {
      try {
        const url = await QRCode.toDataURL(t.qrCode, {
          margin: 1,
          width: 180,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        map.set(t.ticketId, url);
      } catch (err) {
        console.warn('Error generando código QR:', err);
      }
    }

    this.qrDataUrls.set(map);
  }

  async onDownloadPdf(): Promise<void> {
    this.isGeneratingPdf.set(true);
    try {
      await this.pdfService.generateTicketPdf(this.result());
    } catch (e) {
      console.error('Error al descargar PDF:', e);
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  onFinish(): void {
    this.finish.emit();
  }
}
