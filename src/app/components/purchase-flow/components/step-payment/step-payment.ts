import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
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

  @Input({ required: true }) movie!: Movie;
  @Input({ required: true }) schedule!: Schedule;
  @Input({ required: true }) selectedSeats: Seat[] = [];
  @Input({ required: true }) candyItems: SelectedCandyItem[] = [];
  @Input() isProcessing = false;
  @Input() errorMessage: string | null = null;

  @Output() confirmPurchase = new EventEmitter<{ customerName: string; customerEmail: string }>();
  @Output() back = new EventEmitter<void>();

  customerNameInput = signal<string>('');
  customerEmailInput = signal<string>('');

  readonly vipSurcharge = VIP_SURCHARGE;

  get baseTicketPrice(): number {
    const s = this.schedule;
    if (!s) return 5500;
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  }

  get vipSeatsCount(): number {
    return (this.selectedSeats || []).filter(s => s.tipo === 'VIP').length;
  }

  get totalVipSurcharge(): number {
    return this.vipSeatsCount * this.vipSurcharge;
  }

  get ticketsSubtotal(): number {
    return ((this.selectedSeats?.length || 0) * this.baseTicketPrice) + this.totalVipSurcharge;
  }

  get candySubtotal(): number {
    return (this.candyItems || []).reduce((acc, curr) => acc + (curr.precio * curr.cantidad), 0);
  }

  get grandTotal(): number {
    return this.ticketsSubtotal + this.candySubtotal;
  }

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
    if (!this.isFormValid() || this.isProcessing) return;

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
