import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../../../models/movie';

@Component({
  selector: 'app-step-quantity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-quantity.html'
})
export class StepQuantity {
  readonly movie = input.required<Movie>();
  readonly schedule = input.required<Schedule>();
  readonly quantity = input<number>(1);
  readonly isAuthenticated = input<boolean>(false);

  readonly quantityChange = output<number>();
  readonly next = output<void>();
  readonly cancel = output<void>();

  readonly baseTicketPrice = computed(() => {
    const s = this.schedule();
    if (s.isPresale && s.presalePrice != null) {
      return s.presalePrice;
    }
    return s.basePrice || 5500;
  });

  readonly estimatedTotal = computed(() => {
    return this.baseTicketPrice() * this.quantity();
  });

  readonly isUnauthenticatedAdultRestricted = computed(() => {
    const m = this.movie();
    const isAuth = this.isAuthenticated();
    const age = (m.ageRestriction || '').trim();
    return !isAuth && (age === '+18' || age === '18');
  });

  onIncrement(): void {
    if (this.quantity() < 10) {
      this.quantityChange.emit(this.quantity() + 1);
    }
  }

  onDecrement(): void {
    if (this.quantity() > 1) {
      this.quantityChange.emit(this.quantity() - 1);
    }
  }

  onNext(): void {
    this.next.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
