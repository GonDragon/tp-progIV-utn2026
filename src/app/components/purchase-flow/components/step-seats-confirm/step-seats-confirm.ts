import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Schedule } from '../../../../models/movie';
import { Seat } from '../../../../models/seat';
import { VIP_SURCHARGE } from '../../../../services/purchase.service';

@Component({
  selector: 'app-step-seats-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-seats-confirm.html'
})
export class StepSeatsConfirm {
  readonly selectedSeats = input.required<Seat[]>();
  readonly schedule = input.required<Schedule>();

  readonly next = output<void>();
  readonly back = output<void>();

  readonly vipSurcharge = VIP_SURCHARGE;

  readonly baseTicketPrice = computed(() => {
    const s = this.schedule();
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  });

  readonly hasVipSeats = computed(() => {
    return this.selectedSeats().some(s => s.tipo === 'VIP');
  });

  readonly vipSeatsCount = computed(() => {
    return this.selectedSeats().filter(s => s.tipo === 'VIP').length;
  });

  readonly totalVipSurcharge = computed(() => {
    return this.vipSeatsCount() * this.vipSurcharge;
  });

  readonly totalSeatsAmount = computed(() => {
    const baseTotal = this.selectedSeats().length * this.baseTicketPrice();
    return baseTotal + this.totalVipSurcharge();
  });

  onNext(): void {
    this.next.emit();
  }

  onBack(): void {
    this.back.emit();
  }
}
