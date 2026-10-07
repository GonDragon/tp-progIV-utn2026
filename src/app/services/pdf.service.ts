import { Injectable } from '@angular/core';
import { CompletedPurchaseResult } from '../models/purchase';
import { ActiveTicketItem } from '../models/profile';

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

    const primaryColor: [number, number, number] = [212, 175, 55]; // #D4AF37 Gold
    const darkBg: [number, number, number] = [20, 20, 20];
    const cardBg: [number, number, number] = [30, 30, 30];
    const textColor: [number, number, number] = [240, 240, 240];
    const mutedColor: [number, number, number] = [160, 160, 160];

    const tickets = purchase.tickets.length > 0 ? purchase.tickets : [
      { ticketId: 1, seatCode: 'General', seatType: 'Normal', qrCode: `TKT-${purchase.transaccionId}-0` }
    ];
    const totalTickets = tickets.length;

    for (let i = 0; i < totalTickets; i++) {
      const ticket = tickets[i];

      if (i > 0) {
        doc.addPage();
      }

      // Page background
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Header banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 18, 'F');

      doc.setTextColor(15, 15, 15);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`CINE PROG IV • ENTRADA OFICIAL (BOLETO ${i + 1} DE ${totalTickets})`, 105, 12, { align: 'center' });

      // Ticket Container Box
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.roundedRect(15, 24, 180, 258, 4, 4, 'F');

      // Movie title
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(17);
      doc.setFont('helvetica', 'bold');
      doc.text(purchase.movie.title, 25, 38);

      // Movie meta info
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      const ageRest = purchase.movie.ageRestriction || 'ATP';
      const dur = purchase.movie.duration ? `${purchase.movie.duration} min` : '120 min';
      const formatLang = `${purchase.schedule.format || '2D'} • ${purchase.schedule.language || 'Castellano'}`;
      doc.text(`Clasificación: ${ageRest}  |  Duración: ${dur}  |  ${formatLang}`, 25, 45);

      // Divider
      doc.setDrawColor(60, 60, 60);
      doc.line(25, 50, 185, 50);

      // Show details
      let y = 58;
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10.5);

      // Función y Horario
      doc.setFont('helvetica', 'bold');
      doc.text('Función:', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${purchase.schedule.time} hs (${formatLang})`, 58, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Sala:', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(purchase.schedule.room || 'Sala Principal', 58, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Butaca:', 25, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${ticket.seatCode} (${ticket.seatType})`, 58, y);

      y += 7;
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Transacción:', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${purchase.transaccionId}  •  ${purchase.fechaCompra}`, 58, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${purchase.customerName}`, 58, y);

      // Divider
      y += 6;
      doc.setDrawColor(60, 60, 60);
      doc.line(25, y, 185, y);

      // Candy Bar & Combos Section
      y += 7;
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PRODUCTOS CANDY BAR & COMBOS:', 25, y);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);

      if (purchase.candyItems && purchase.candyItems.length > 0) {
        for (const item of purchase.candyItems) {
          y += 5.5;
          const line = `• ${item.cantidad}x ${item.nombre}  ($${(item.precio * item.cantidad).toLocaleString('es-AR')})`;
          doc.text(line, 28, y);
        }
      } else {
        y += 5.5;
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text('• Ningún producto de Candy Bar incluido en esta orden', 28, y);
      }

      // Divider
      y += 5;
      doc.setDrawColor(60, 60, 60);
      doc.line(25, y, 185, y);

      // Total Amount
      y += 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`TOTAL TRANSACCIÓN: $${purchase.montoTotal.toLocaleString('es-AR')}`, 25, y);

      // Generate QR Code for this specific ticket
      const qrText = ticket.qrCode;
      const qrDataUrl = await QRCode.toDataURL(qrText, {
        margin: 1,
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // QR Code Container Box
      const qrY = Math.max(y + 8, 168);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(70, qrY, 70, 70, 3, 3, 'F');
      doc.addImage(qrDataUrl, 'PNG', 73, qrY + 3, 64, 64);

      // QR Label
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`QR DE ACCESO • BUTACA ${ticket.seatCode}`, 105, qrY + 77, { align: 'center' });

      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(qrText, 105, qrY + 82, { align: 'center' });
      doc.text('Presenta este código QR en el acceso a la sala. Válido para 1 persona en la butaca asignada.', 105, qrY + 87, { align: 'center' });

      // Bottom footer info
      doc.setFontSize(7.5);
      doc.text(`Boleto ${i + 1} de ${totalTickets}  |  Transacción #${purchase.transaccionId}`, 105, 276, { align: 'center' });
    }

    // Save PDF
    doc.save(`Entradas_Cine_${purchase.transaccionId}.pdf`);
  }

  async generateSingleTicketPdf(ticket: ActiveTicketItem): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const QRCode = await import('qrcode');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [212, 175, 55]; // #D4AF37 Gold
    const darkBg: [number, number, number] = [20, 20, 20];
    const cardBg: [number, number, number] = [30, 30, 30];
    const textColor: [number, number, number] = [240, 240, 240];
    const mutedColor: [number, number, number] = [160, 160, 160];

    // Page background
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 297, 'F');

    // Header banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 18, 'F');

    doc.setTextColor(15, 15, 15);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`CINE PROG IV • BOLETO DIGITAL OFICIAL`, 105, 12, { align: 'center' });

    // Ticket Container Box
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(15, 24, 180, 258, 4, 4, 'F');

    // Movie title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.movie.title || 'Función de Cine', 25, 38);

    // Movie meta info
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    const ageRest = ticket.movie.ageRestriction || 'ATP';
    const dur = ticket.movie.duration ? `${ticket.movie.duration} min` : '120 min';
    const formatLang = `${ticket.schedule.format || '2D'} • ${ticket.schedule.language || 'Castellano'}`;
    doc.text(`Clasificación: ${ageRest}  |  Duración: ${dur}  |  ${formatLang}`, 25, 45);

    // Divider
    doc.setDrawColor(60, 60, 60);
    doc.line(25, 50, 185, 50);

    // Show details
    let y = 58;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(10.5);

    // Función y Horario
    doc.setFont('helvetica', 'bold');
    doc.text('Función:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${ticket.schedule.time} hs (${formatLang})`, 58, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Sala:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.schedule.room || 'Sala Principal', 58, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Butaca:', 25, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Fila ${ticket.seat.fila} - Butaca ${ticket.seat.columna} (${ticket.seat.seatType})`, 58, y);

    y += 7;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Transacción:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${ticket.transaccionId}  •  ${ticket.transaccion.fechaCompra || 'Compra reciente'}`, 58, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Titular:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${ticket.customerName} (${ticket.customerEmail})`, 58, y);

    // Divider
    y += 6;
    doc.setDrawColor(60, 60, 60);
    doc.line(25, y, 185, y);

    // Candy Bar Section
    y += 7;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PRODUCTOS CANDY BAR & COMBOS:', 25, y);

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    if (ticket.candyItems && ticket.candyItems.length > 0) {
      for (const item of ticket.candyItems) {
        y += 5.5;
        const line = `• ${item.cantidad}x ${item.nombre}`;
        doc.text(line, 28, y);
      }
    } else {
      y += 5.5;
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text('• Sin productos de Candy Bar asociados', 28, y);
    }

    // Divider
    y += 5;
    doc.setDrawColor(60, 60, 60);
    doc.line(25, y, 185, y);

    // Total Amount
    y += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`ESTADO BOLETO: ${ticket.estadoQr.toUpperCase()}`, 25, y);

    // Generate QR Code for this specific ticket
    const qrText = ticket.codigoQr;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // QR Code Container Box
    const qrY = Math.max(y + 8, 168);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(70, qrY, 70, 70, 3, 3, 'F');
    doc.addImage(qrDataUrl, 'PNG', 73, qrY + 3, 64, 64);

    // QR Label
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`QR DE ACCESO • BUTACA ${ticket.seat.seatCode}`, 105, qrY + 77, { align: 'center' });

    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(qrText, 105, qrY + 82, { align: 'center' });
    doc.text('Presenta este código QR en el acceso a la sala. Válido para 1 persona en la butaca asignada.', 105, qrY + 87, { align: 'center' });

    // Bottom footer info
    doc.setFontSize(7.5);
    doc.text(`Boleto #${ticket.id}  |  Transacción #${ticket.transaccionId}`, 105, 276, { align: 'center' });

    // Save PDF
    const safeTitle = (ticket.movie.title || 'Boleto').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Boleto_${safeTitle}_${ticket.seat.seatCode}.pdf`);
  }
}
