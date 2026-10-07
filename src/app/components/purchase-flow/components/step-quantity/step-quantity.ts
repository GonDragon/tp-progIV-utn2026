import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../../../models/movie';

@Component({
  selector: 'app-step-quantity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-quantity.html'
})
export class StepQuantity {
  @Input({ required: true }) movie!: Movie;
  @Input({ required: true }) schedule!: Schedule;
  @Input() quantity = 1;
  @Input() isAuthenticated = false;

  @Output() quantityChange = new EventEmitter<number>();
  @Output() next = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get baseTicketPrice(): number {
    const s = this.schedule;
    if (!s) return 5500;
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  }

  get estimatedTotal(): number {
    return this.baseTicketPrice * this.quantity;
  }

  get isUnauthenticatedAdultRestricted(): boolean {
    const m = this.movie;
    const isAuth = this.isAuthenticated;
    if (!m) return false;
    const age = (m.ageRestriction || '').trim();
    return !isAuth && (age === '+18' || age === '18');
  }

  onIncrement(): void {
    if (this.quantity < 10) {
      this.quantityChange.emit(this.quantity + 1);
    }
  }

  onDecrement(): void {
    if (this.quantity > 1) {
      this.quantityChange.emit(this.quantity - 1);
    }
  }

  onNext(): void {
    this.next.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
