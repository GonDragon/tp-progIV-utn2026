import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaleTransactionPayload } from '../../../../../../models/reports';

interface CandyItemSelection {
  type: 'product' | 'combo';
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

@Component({
  selector: 'app-quick-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-sale-modal.html',
  styleUrl: './quick-sale-modal.css'
})
export class QuickSaleModal {
  readonly isOpen = input.required<boolean>();
  readonly functions = input.required<any[]>();
  readonly movies = input.required<any[]>();
  readonly candyProducts = input.required<any[]>();
  readonly combos = input.required<any[]>();
  readonly isSaving = input<boolean>(false);

  readonly close = output<void>();
  readonly save = output<SaleTransactionPayload>();

  // Form State
  readonly selectedFunctionId = signal<number | null>(null);
  readonly ticketCount = signal<number>(2);
  readonly selectedCandyItems = signal<CandyItemSelection[]>([]);

  // Selected function helper
  readonly currentFunction = computed(() => {
    const fid = this.selectedFunctionId();
    if (!fid) return null;
    return this.functions().find(f => f.id === Number(fid)) || null;
  });

  readonly currentMovie = computed(() => {
    const fn = this.currentFunction();
    if (!fn) return null;
    return this.movies().find(m => m.id === fn.pelicula_id) || null;
  });

  // Calculate Subtotals
  readonly ticketsSubtotal = computed(() => {
    const fn = this.currentFunction();
    if (!fn) return 0;
    const price = Number(fn.precio_base) || 0;
    return price * this.ticketCount();
  });

  readonly candySubtotal = computed(() => {
    return this.selectedCandyItems().reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  });

  readonly totalAmount = computed(() => {
    return this.ticketsSubtotal() + this.candySubtotal();
  });

  // Candy item add handler
  addCandyItem(type: 'product' | 'combo', item: any): void {
    const current = this.selectedCandyItems();
    const existingIndex = current.findIndex(i => i.type === type && i.id === item.id);

    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex].cantidad += 1;
      this.selectedCandyItems.set(updated);
    } else {
      this.selectedCandyItems.set([
        ...current,
        {
          type,
          id: item.id,
          nombre: item.nombre,
          precio: Number(type === 'product' ? item.precio : item.precio_fijo) || 0,
          cantidad: 1
        }
      ]);
    }
  }

  updateItemQuantity(index: number, delta: number): void {
    const current = [...this.selectedCandyItems()];
    const item = current[index];
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
      current.splice(index, 1);
    }
    this.selectedCandyItems.set(current);
  }

  onSubmit(): void {
    const fn = this.currentFunction();
    const count = this.ticketCount();
    if (!fn && this.selectedCandyItems().length === 0) return;

    const ticketsPayload = [];
    if (fn && count > 0) {
      for (let i = 0; i < count; i++) {
        ticketsPayload.push({
          funcionId: fn.id,
          precio: Number(fn.precio_base) || 0
        });
      }
    }

    const candyPayload = this.selectedCandyItems().map(item => ({
      productoId: item.type === 'product' ? item.id : null,
      comboId: item.type === 'combo' ? item.id : null,
      cantidad: item.cantidad,
      precioUnitario: item.precio
    }));

    this.save.emit({
      tickets: ticketsPayload,
      candyItems: candyPayload
    });
  }
}
