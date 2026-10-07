import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Combo } from '../../../../../../models/candy';

@Component({
  selector: 'app-combo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './combo-modal.html'
})
export class ComboModal implements OnChanges {
  @Input({ required: true }) isOpen = false;
  @Input() combo: Combo | null = null;
  @Input() isSaving = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    nombre: string;
    precio_fijo: number;
  }>();

  nombre = signal<string>('');
  precio_fijo = signal<number>(0);
  validationError = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen) {
      this.validationError.set(null);
      if (this.combo) {
        this.nombre.set(this.combo.nombre);
        this.precio_fijo.set(this.combo.precio_fijo);
      } else {
        this.nombre.set('');
        this.precio_fijo.set(0);
      }
    }
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
    if (!this.isSaving) {
      this.closeModal.emit();
    }
  }
}
