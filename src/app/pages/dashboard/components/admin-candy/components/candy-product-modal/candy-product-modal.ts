import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandyProduct, CANDY_CATEGORIES, CandyCategory } from '../../../../../../models/candy';

@Component({
  selector: 'app-candy-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candy-product-modal.html'
})
export class CandyProductModal {
  readonly isOpen = input.required<boolean>();
  readonly product = input<CandyProduct | null>(null);
  readonly isSaving = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly save = output<{
    nombre: string;
    categoria: string;
    precio: number;
    costo_puntos: number;
  }>();

  readonly categories = CANDY_CATEGORIES;

  nombre = signal<string>('');
  categoria = signal<CandyCategory>('Pochoclos');
  precio = signal<number>(0);
  costo_puntos = signal<number>(0);
  validationError = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const prod = this.product();
        if (this.isOpen()) {
          this.validationError.set(null);
          if (prod) {
            this.nombre.set(prod.nombre);
            this.categoria.set((prod.categoria as CandyCategory) || 'Pochoclos');
            this.precio.set(prod.precio);
            this.costo_puntos.set(prod.costo_puntos);
          } else {
            this.nombre.set('');
            this.categoria.set('Pochoclos');
            this.precio.set(0);
            this.costo_puntos.set(0);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  onSubmit(): void {
    const trimmedNombre = this.nombre().trim();
    if (!trimmedNombre) {
      this.validationError.set('El nombre del producto es obligatorio.');
      return;
    }

    if (this.precio() < 0) {
      this.validationError.set('El precio no puede ser negativo.');
      return;
    }

    if (this.costo_puntos() < 0) {
      this.validationError.set('El costo en puntos no puede ser negativo.');
      return;
    }

    this.validationError.set(null);
    this.save.emit({
      nombre: trimmedNombre,
      categoria: this.categoria(),
      precio: Number(this.precio()) || 0,
      costo_puntos: Number(this.costo_puntos()) || 0
    });
  }

  onClose(): void {
    if (!this.isSaving()) {
      this.closeModal.emit();
    }
  }
}
