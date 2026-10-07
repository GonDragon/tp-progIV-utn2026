import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input({ required: true }) selectedSeats: Seat[] = [];
  @Input({ required: true }) schedule!: Schedule;

  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  readonly vipSurcharge = VIP_SURCHARGE;

  get baseTicketPrice(): number {
    const s = this.schedule;
    if (!s) return 5500;
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  }

  get hasVipSeats(): boolean {
    return (this.selectedSeats || []).some(s => s.tipo === 'VIP');
  }

  get vipSeatsCount(): number {
    return (this.selectedSeats || []).filter(s => s.tipo === 'VIP').length;
  }

  get totalVipSurcharge(): number {
    return this.vipSeatsCount * this.vipSurcharge;
  }

  get totalSeatsAmount(): number {
    const baseTotal = (this.selectedSeats?.length || 0) * this.baseTicketPrice;
    return baseTotal + this.totalVipSurcharge;
  }

  onNext(): void {
    this.next.emit();
  }

  onBack(): void {
    this.back.emit();
  }
}
