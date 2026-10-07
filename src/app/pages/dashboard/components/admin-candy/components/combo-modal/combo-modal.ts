import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Combo } from '../../../../../../models/candy';

@Component({
  selector: 'app-combo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './combo-modal.html'
})
export class ComboModal {
  readonly isOpen = input.required<boolean>();
  readonly combo = input<Combo | null>(null);
  readonly isSaving = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly save = output<{
    nombre: string;
    precio_fijo: number;
  }>();

  nombre = signal<string>('');
  precio_fijo = signal<number>(0);
  validationError = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const c = this.combo();
        if (this.isOpen()) {
          this.validationError.set(null);
          if (c) {
            this.nombre.set(c.nombre);
            this.precio_fijo.set(c.precio_fijo);
          } else {
            this.nombre.set('');
            this.precio_fijo.set(0);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  onSubmit(): void {
    const trimmedNombre = this.nombre().trim();
    if (!trimmedNombre) {
      this.validationError.set('El nombre del combo es obligatorio.');
      return;
    }

    if (this.precio_fijo() < 0) {
      this.validationError.set('El precio no puede ser negativo.');
      return;
    }

    this.validationError.set(null);
    this.save.emit({
      nombre: trimmedNombre,
      precio_fijo: Number(this.precio_fijo()) || 0
    });
  }

  onClose(): void {
    if (!this.isSaving()) {
      this.closeModal.emit();
    }
  }
}
