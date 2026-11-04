import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coupon } from '../../../../../../models/coupon';

@Component({
  selector: 'app-coupon-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-modal.html'
})
export class CouponModal {
  readonly isOpen = input.required<boolean>();
  readonly coupon = input<Coupon | null>(null);
  readonly isSaving = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly save = output<{
    codigo: string;
    porcentaje_descuento: number;
  }>();

  codigo = signal<string>('');
  porcentaje_descuento = signal<number>(10);
  validationError = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const c = this.coupon();
        if (this.isOpen()) {
          this.validationError.set(null);
          if (c) {
            this.codigo.set(c.codigo);
            this.porcentaje_descuento.set(c.porcentaje_descuento);
          } else {
            this.codigo.set('');
            this.porcentaje_descuento.set(10);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  onSubmit(): void {
    const trimmedCode = this.codigo().trim().toUpperCase();
    if (!trimmedCode) {
      this.validationError.set('El código del cupón es obligatorio.');
      return;
    }

    const discount = Number(this.porcentaje_descuento());
    if (isNaN(discount) || discount <= 0 || discount > 100) {
      this.validationError.set('El porcentaje de descuento debe estar entre 1 y 100.');
      return;
    }

    this.validationError.set(null);
    this.save.emit({
      codigo: trimmedCode,
      porcentaje_descuento: discount
    });
  }

  onClose(): void {
    if (!this.isSaving()) {
      this.closeModal.emit();
    }
  }
}
