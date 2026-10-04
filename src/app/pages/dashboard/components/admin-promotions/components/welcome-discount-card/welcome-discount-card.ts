import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coupon } from '../../../../../../models/coupon';

@Component({
  selector: 'app-welcome-discount-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './welcome-discount-card.html'
})
export class WelcomeDiscountCard {
  readonly welcomeCoupon = input<Coupon | null>(null);
  readonly isSaving = input<boolean>(false);
  readonly saveWelcomeDiscount = output<number>();

  discountPercent = signal<number>(20);
  validationError = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const coupon = this.welcomeCoupon();
        if (coupon) {
          this.discountPercent.set(coupon.porcentaje_descuento);
        }
      },
      { allowSignalWrites: true }
    );
  }

  onSave(): void {
    const val = Number(this.discountPercent());
    if (isNaN(val) || val <= 0 || val > 100) {
      this.validationError.set('El porcentaje debe estar entre 1 y 100.');
      return;
    }
    this.validationError.set(null);
    this.saveWelcomeDiscount.emit(val);
  }
}
