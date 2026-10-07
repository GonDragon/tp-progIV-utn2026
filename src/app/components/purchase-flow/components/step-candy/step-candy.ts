import { Component, input, output, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandyService } from '../../../../services/candy.service';
import { SelectedCandyItem } from '../../../../models/purchase';
import { CandyProduct, Combo } from '../../../../models/candy';

@Component({
  selector: 'app-step-candy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-candy.html'
})
export class StepCandy implements OnInit {
  readonly candyService = inject(CandyService);

  readonly selectedItems = input.required<SelectedCandyItem[]>();
  readonly itemsChange = output<SelectedCandyItem[]>();
  readonly next = output<void>();
  readonly back = output<void>();

  readonly activeTab = signal<'combos' | 'productos'>('combos');

  readonly totalCandyAmount = computed(() => {
    return this.selectedItems().reduce((acc, curr) => acc + (curr.precio * curr.cantidad), 0);
  });

  readonly totalItemsCount = computed(() => {
    return this.selectedItems().reduce((acc, curr) => acc + curr.cantidad, 0);
  });

  async ngOnInit(): Promise<void> {
    if (this.candyService.products().length === 0 || this.candyService.combos().length === 0) {
      await this.candyService.initData();
    }
  }

  getQuantity(id: number, type: 'producto' | 'combo'): number {
    const item = this.selectedItems().find(i => i.id === id && i.tipo === type);
    return item ? item.cantidad : 0;
  }

  incrementProduct(product: CandyProduct): void {
    const current = [...this.selectedItems()];
    const index = current.findIndex(i => i.id === product.id && i.tipo === 'producto');

    if (index >= 0) {
      current[index] = {
        ...current[index],
        cantidad: current[index].cantidad + 1
      };
    } else {
      current.push({
        id: product.id,
        tipo: 'producto',
        nombre: product.nombre,
        categoria: product.categoria,
        precio: product.precio,
        cantidad: 1
      });
    }

    this.itemsChange.emit(current);
  }

  decrementProduct(product: CandyProduct): void {
    const current = [...this.selectedItems()];
    const index = current.findIndex(i => i.id === product.id && i.tipo === 'producto');

    if (index >= 0) {
      if (current[index].cantidad > 1) {
        current[index] = {
          ...current[index],
          cantidad: current[index].cantidad - 1
        };
      } else {
        current.splice(index, 1);
      }
      this.itemsChange.emit(current);
    }
  }

  incrementCombo(combo: Combo): void {
    const current = [...this.selectedItems()];
    const index = current.findIndex(i => i.id === combo.id && i.tipo === 'combo');

    if (index >= 0) {
      current[index] = {
        ...current[index],
        cantidad: current[index].cantidad + 1
      };
    } else {
      current.push({
        id: combo.id,
        tipo: 'combo',
        nombre: combo.nombre,
        precio: combo.precio_fijo,
        cantidad: 1
      });
    }

    this.itemsChange.emit(current);
  }

  decrementCombo(combo: Combo): void {
    const current = [...this.selectedItems()];
    const index = current.findIndex(i => i.id === combo.id && i.tipo === 'combo');

    if (index >= 0) {
      if (current[index].cantidad > 1) {
        current[index] = {
          ...current[index],
          cantidad: current[index].cantidad - 1
        };
      } else {
        current.splice(index, 1);
      }
      this.itemsChange.emit(current);
    }
  }

  onNext(): void {
    this.next.emit();
  }

  onBack(): void {
    this.back.emit();
  }
}
