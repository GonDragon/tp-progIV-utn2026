import { Component, input, output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Movie, Schedule } from '../../../../models/movie';
import { Seat } from '../../../../models/seat';
import { SelectedCandyItem } from '../../../../models/purchase';
import { AuthService } from '../../../../services/auth';
import { VIP_SURCHARGE } from '../../../../services/purchase.service';

@Component({
  selector: 'app-step-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-payment.html'
})
export class StepPayment implements OnInit {
  private readonly authService = inject(AuthService);

  readonly movie = input.required<Movie>();
  readonly schedule = input.required<Schedule>();
  readonly selectedSeats = input.required<Seat[]>();
  readonly candyItems = input.required<SelectedCandyItem[]>();
  readonly isProcessing = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly confirmPurchase = output<{ customerName: string; customerEmail: string }>();
  readonly back = output<void>();

  customerNameInput = signal<string>('');
  customerEmailInput = signal<string>('');

  readonly vipSurcharge = VIP_SURCHARGE;

  readonly baseTicketPrice = computed(() => {
    const s = this.schedule();
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  });

  readonly vipSeatsCount = computed(() => {
    return this.selectedSeats().filter(s => s.tipo === 'VIP').length;
  });

  readonly totalVipSurcharge = computed(() => {
    return this.vipSeatsCount() * this.vipSurcharge;
  });

  readonly ticketsSubtotal = computed(() => {
    return (this.selectedSeats().length * this.baseTicketPrice()) + this.totalVipSurcharge();
  });

  readonly candySubtotal = computed(() => {
    return this.candyItems().reduce((acc, curr) => acc + (curr.precio * curr.cantidad), 0);
  });

  readonly grandTotal = computed(() => {
    return this.ticketsSubtotal() + this.candySubtotal();
  });

  readonly currentUser = computed(() => this.authService.currentUser());

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.customerNameInput.set(`${user.nombre} ${user.apellido}`.trim() || 'Cliente Registrado');
      this.customerEmailInput.set(user.email || '');
    }
  }

  isFormValid(): boolean {
    if (this.currentUser()) {
      return true;
    }
    const name = this.customerNameInput().trim();
    const email = this.customerEmailInput().trim();
    return name.length > 2 && email.includes('@') && email.includes('.');
  }

  onConfirm(): void {
    if (!this.isFormValid() || this.isProcessing()) return;

    let finalName = this.customerNameInput().trim();
    let finalEmail = this.customerEmailInput().trim();

    const user = this.currentUser();
    if (user) {
      finalName = `${user.nombre} ${user.apellido}`.trim() || user.email;
      finalEmail = user.email;
    }

    this.confirmPurchase.emit({
      customerName: finalName || 'Cliente Invitado',
      customerEmail: finalEmail || 'invitado@cine.com'
    });
  }

  onBack(): void {
    this.back.emit();
  }
}
