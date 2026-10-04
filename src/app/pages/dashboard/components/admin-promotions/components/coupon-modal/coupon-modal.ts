import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coupon, COUPON_RESTRICTIONS } from '../../../../../../models/coupon';

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
    tipo_restriccion: string;
  }>();

  readonly defaultRestrictions = COUPON_RESTRICTIONS;

  codigo = signal<string>('');
  porcentaje_descuento = signal<number>(10);
  tipo_restriccion = signal<string>('Ninguna');
  isCustomRestriction = signal<boolean>(false);
  customRestriction = signal<string>('');
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
            const isStandard = (this.defaultRestrictions as readonly string[]).includes(c.tipo_restriccion);
            if (isStandard) {
              this.tipo_restriccion.set(c.tipo_restriccion);
              this.isCustomRestriction.set(false);
              this.customRestriction.set('');
            } else {
              this.tipo_restriccion.set('Personalizada');
              this.isCustomRestriction.set(true);
              this.customRestriction.set(c.tipo_restriccion);
            }
          } else {
            this.codigo.set('');
            this.porcentaje_descuento.set(10);
            this.tipo_restriccion.set('Ninguna');
            this.isCustomRestriction.set(false);
            this.customRestriction.set('');
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  onRestrictionChange(value: string): void {
    this.tipo_restriccion.set(value);
    this.isCustomRestriction.set(value === 'Personalizada');
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

    let finalRestriction = this.tipo_restriccion();
    if (this.isCustomRestriction()) {
      const customTrimmed = this.customRestriction().trim();
      if (!customTrimmed) {
        this.validationError.set('Debes especificar la restricción personalizada.');
        return;
      }
      finalRestriction = customTrimmed;
    }

    this.validationError.set(null);
    this.save.emit({
      codigo: trimmedCode,
      porcentaje_descuento: discount,
      tipo_restriccion: finalRestriction
    });
  }

  onClose(): void {
    if (!this.isSaving()) {
      this.closeModal.emit();
    }
  }
}
