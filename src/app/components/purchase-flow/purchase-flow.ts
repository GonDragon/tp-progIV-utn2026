import { Component, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../models/movie';
import { Seat } from '../../models/seat';
import { SelectedCandyItem, CompletedPurchaseResult } from '../../models/purchase';
import { AuthService } from '../../services/auth';
import { PurchaseService } from '../../services/purchase.service';
import { StepQuantity } from './components/step-quantity/step-quantity';
import { StepSeats } from './components/step-seats/step-seats';
import { StepSeatsConfirm } from './components/step-seats-confirm/step-seats-confirm';
import { StepCandy } from './components/step-candy/step-candy';
import { StepPayment } from './components/step-payment/step-payment';
import { StepSuccess } from './components/step-success/step-success';

export type PurchaseStep = 'quantity' | 'seats' | 'seats-confirm' | 'candy' | 'payment' | 'success';

@Component({
  selector: 'app-purchase-flow',
  standalone: true,
  imports: [
    CommonModule,
    StepQuantity,
    StepSeats,
    StepSeatsConfirm,
    StepCandy,
    StepPayment,
    StepSuccess
  ],
  templateUrl: './purchase-flow.html',
  styleUrl: './purchase-flow.css'
})
export class PurchaseFlow {
  private readonly authService = inject(AuthService);
  private readonly purchaseService = inject(PurchaseService);

  readonly movie = input<Movie | null>(null);
  readonly schedule = input<Schedule | null>(null);

  readonly close = output<void>();
  readonly purchaseCompleted = output<CompletedPurchaseResult>();

  readonly currentStep = signal<PurchaseStep>('quantity');
  readonly ticketQuantity = signal<number>(1);
  readonly selectedSeats = signal<Seat[]>([]);
  readonly candyItems = signal<SelectedCandyItem[]>([]);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly completedResult = signal<CompletedPurchaseResult | null>(null);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly stepTitle = computed(() => {
    switch (this.currentStep()) {
      case 'quantity': return 'Paso 1: Cantidad de Entradas';
      case 'seats': return 'Paso 2: Selección de Butacas';
      case 'seats-confirm': return 'Paso 3: Confirmación de Asientos';
      case 'candy': return 'Paso 4: Candy Bar y Adiciones';
      case 'payment': return 'Paso 5: Pago y Confirmación';
      case 'success': return 'Comprobante de Compra';
      default: return 'Compra de Entradas';
    }
  });

  readonly stepProgressIndex = computed(() => {
    switch (this.currentStep()) {
      case 'quantity': return 1;
      case 'seats': return 2;
      case 'seats-confirm': return 3;
      case 'candy': return 4;
      case 'payment': return 5;
      case 'success': return 6;
      default: return 1;
    }
  });

  async onQuantityChange(q: number): Promise<void> {
    this.ticketQuantity.set(q);
    // Si la cantidad se reduce, deseleccionar los asientos excedentes y liberar sus reservas
    if (this.selectedSeats().length > q) {
      const s = this.schedule();
      const funcionId = s ? Number(s.id) : null;
      const toKeep = this.selectedSeats().slice(0, q);
      const toRemove = this.selectedSeats().slice(q);
      this.selectedSeats.set(toKeep);

      if (funcionId) {
        for (const seat of toRemove) {
          await this.purchaseService.releaseSeatReservation(funcionId, seat.id);
        }
      }
    }
  }

  async onSeatToggled(seat: Seat): Promise<void> {
    const s = this.schedule();
    if (!s) return;
    const funcionId = Number(s.id);

    const current = [...this.selectedSeats()];
    const index = current.findIndex(s => s.id === seat.id || (s.fila === seat.fila && s.columna === seat.columna));

    if (index >= 0) {
      // Deselección: se remueve y se elimina obligatoriamente la reserva temporal
      const removed = current.splice(index, 1)[0];
      this.selectedSeats.set(current);
      await this.purchaseService.releaseSeatReservation(funcionId, removed.id);
    } else {
      // Selección: si está dentro de la cantidad requerida
      if (current.length < this.ticketQuantity()) {
        const res = await this.purchaseService.reserveSeat(funcionId, seat.id);
        if (res.success) {
          current.push(seat);
          this.selectedSeats.set(current);
        } else if (res.error) {
          console.warn('No se pudo reservar la butaca:', res.error);
        }
      } else {
        // Si se alcanzó el límite, reemplazar la primera butaca
        const removed = current.shift();
        if (removed) {
          await this.purchaseService.releaseSeatReservation(funcionId, removed.id);
        }
        const res = await this.purchaseService.reserveSeat(funcionId, seat.id);
        if (res.success) {
          current.push(seat);
          this.selectedSeats.set(current);
        } else if (res.error) {
          console.warn('No se pudo reservar la butaca:', res.error);
        }
      }
    }
  }

  onCandyItemsChange(items: SelectedCandyItem[]): void {
    this.candyItems.set(items);
  }

  async onConfirmPurchase(customer: { customerName: string; customerEmail: string }): Promise<void> {
    const m = this.movie();
    const s = this.schedule();

    if (!m || !s) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const res = await this.purchaseService.processPurchase({
      movie: m,
      schedule: s,
      selectedSeats: this.selectedSeats(),
      candyItems: this.candyItems(),
      customerName: customer.customerName,
      customerEmail: customer.customerEmail
    });

    this.isProcessing.set(false);

    if (res.success && res.result) {
      this.completedResult.set(res.result);
      this.currentStep.set('success');
      this.purchaseCompleted.emit(res.result);
    } else {
      this.errorMessage.set(res.error || 'No se pudo procesar la compra. Intenta nuevamente.');
    }
  }

  onCloseModal(): void {
    const s = this.schedule();
    if (s && this.currentStep() !== 'success') {
      const funcionId = Number(s.id);
      this.purchaseService.releaseAllReservationsForSession(funcionId);
      this.selectedSeats.set([]);
    }
    this.close.emit();
  }

  goToStep(step: PurchaseStep): void {
    this.currentStep.set(step);
  }
}
