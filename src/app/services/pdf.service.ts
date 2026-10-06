import { Injectable } from '@angular/core';
import { CompletedPurchaseResult } from '../models/purchase';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  async generateTicketPdf(purchase: CompletedPurchaseResult): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const QRCode = await import('qrcode');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [212, 175, 55]; // #D4AF37 Gold
    const darkBg = [20, 20, 20];
    const cardBg = [30, 30, 30];
    const textColor = [240, 240, 240];
    const mutedColor = [160, 160, 160];

    // Page background
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 297, 'F');

    // Header banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 18, 'F');

    doc.setTextColor(15, 15, 15);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CINE PROG IV • ENTRADA OFICIAL Y COMPROBANTE', 105, 12, { align: 'center' });

    // Ticket Container Box
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(15, 26, 180, 250, 4, 4, 'F');

    // Movie title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(purchase.movie.title, 25, 42);

    // Movie meta info
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const ageRest = purchase.movie.ageRestriction || 'ATP';
    const dur = purchase.movie.duration ? `${purchase.movie.duration} min` : '';
    doc.text(`Clasificación: ${ageRest}  |  Duración: ${dur}`, 25, 49);

    // Divider
    doc.setDrawColor(60, 60, 60);
    doc.line(25, 54, 185, 54);

    // Show details
    let y = 64;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(11);

    doc.setFont('helvetica', 'bold');
    doc.text('Función:', 25, y);
    doc.setFont('helvetica', 'normal');
    const timeFormatted = `${purchase.schedule.time} hs - ${purchase.schedule.format} (${purchase.schedule.language})`;
    doc.text(timeFormatted, 60, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Sala:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(purchase.schedule.room || 'Sala Principal', 60, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Transacción:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${purchase.transaccionId} (${purchase.fechaCompra})`, 60, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${purchase.customerName} (${purchase.customerEmail})`, 60, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Butacas:', 25, y);
    doc.setFont('helvetica', 'normal');
    const seatList = purchase.tickets.map(t => `${t.seatCode} (${t.seatType})`).join(', ');
    doc.text(seatList, 60, y);

    // Divider
    y += 8;
    doc.setDrawColor(60, 60, 60);
    doc.line(25, y, 185, y);

    // Candy Bar Section if applicable
    if (purchase.candyItems && purchase.candyItems.length > 0) {
      y += 9;
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Candy Bar & Adiciones:', 25, y);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'normal');
      for (const item of purchase.candyItems) {
        y += 6;
        const line = `• ${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toLocaleString('es-AR')}`;
        doc.text(line, 30, y);
      }
      y += 4;
      doc.setDrawColor(60, 60, 60);
      doc.line(25, y, 185, y);
    }

    // Total Amount
    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`TOTAL ABONADO: $${purchase.montoTotal.toLocaleString('es-AR')}`, 25, y);

    // Generate QR Code for the primary ticket or combined code
    const qrText = purchase.tickets[0]?.qrCode || `TKT-${purchase.transaccionId}-${Date.now()}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // QR Code Container Box
    const qrY = Math.max(y + 12, 160);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(65, qrY, 80, 80, 3, 3, 'F');
    doc.addImage(qrDataUrl, 'PNG', 70, qrY + 5, 70, 70);

    // QR Label
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CÓDIGO DE ACCESO / CONTROL DE ENTRADA', 105, qrY + 88, { align: 'center' });

    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(qrText, 105, qrY + 93, { align: 'center' });
    doc.text('Presenta este código QR en la entrada o taquilla del cine para ingresar.', 105, qrY + 98, { align: 'center' });

    // Save PDF
    doc.save(`Entrada_Cine_${purchase.transaccionId}.pdf`);
  }
}
