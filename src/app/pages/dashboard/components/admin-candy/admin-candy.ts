import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandyService } from '../../../../services/candy.service';
import { CandyProduct, Combo, CANDY_CATEGORIES } from '../../../../models/candy';
import { CandyProductCard } from './components/candy-product-card/candy-product-card';
import { CandyProductModal } from './components/candy-product-modal/candy-product-modal';
import { ComboCard } from './components/combo-card/combo-card';
import { ComboModal } from './components/combo-modal/combo-modal';

@Component({
  selector: 'app-admin-candy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CandyProductCard,
    CandyProductModal,
    ComboCard,
    ComboModal
  ],
  templateUrl: './admin-candy.html',
  styleUrl: './admin-candy.css'
})
export class AdminCandy {
  readonly candyService = inject(CandyService);

  readonly activeTab = signal<'products' | 'combos'>('products');
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('all');

  readonly categories = ['all', ...CANDY_CATEGORIES];

  // Product modal & state
  readonly showProductModal = signal(false);
  readonly editingProduct = signal<CandyProduct | null>(null);
  readonly isSavingProduct = signal(false);

  // Combo modal & state
  readonly showComboModal = signal(false);
  readonly editingCombo = signal<Combo | null>(null);
  readonly isSavingCombo = signal(false);

  // Delete confirmation modal state
  readonly itemToDelete = signal<{
    type: 'product' | 'combo';
    id: number;
    name: string;
  } | null>(null);
  readonly isDeleting = signal(false);

  // Toast / feedback message
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimer: any = null;

  // Filtered Products
  readonly filteredProducts = computed(() => {
    const list = this.candyService.products();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return list.filter(prod => {
      const matchCat = cat === 'all' || prod.categoria.toLowerCase() === cat.toLowerCase();
      const matchQuery =
        !query ||
        prod.nombre.toLowerCase().includes(query) ||
        prod.categoria.toLowerCase().includes(query) ||
        String(prod.id).includes(query);

      return matchCat && matchQuery;
    });
  });

  // Filtered Combos
  readonly filteredCombos = computed(() => {
    const list = this.candyService.combos();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter(combo => {
      return (
        !query ||
        combo.nombre.toLowerCase().includes(query) ||
        String(combo.id).includes(query)
      );
    });
  });

  private showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  // --- Product Handlers ---
  openNewProductModal(): void {
    this.editingProduct.set(null);
    this.showProductModal.set(true);
  }

  openEditProductModal(product: CandyProduct): void {
    this.editingProduct.set(product);
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
    this.editingProduct.set(null);
  }

  async saveProduct(data: {
    nombre: string;
    categoria: string;
    precio: number;
    costo_puntos: number;
  }): Promise<void> {
    this.isSavingProduct.set(true);
    const prod = this.editingProduct();

    if (prod) {
      const success = await this.candyService.updateProduct(prod.id, data);
      this.isSavingProduct.set(false);
      if (success) {
        this.closeProductModal();
        this.showToastMessage(`Producto "${data.nombre}" actualizado correctamente.`);
      } else {
        this.showToastMessage(this.candyService.error() || 'Error al actualizar producto.', 'error');
      }
    } else {
      const created = await this.candyService.createProduct(data);
      this.isSavingProduct.set(false);
      if (created) {
        this.closeProductModal();
        this.showToastMessage(`Producto "${data.nombre}" creado exitosamente.`);
      } else {
        this.showToastMessage(this.candyService.error() || 'Error al crear producto.', 'error');
      }
    }
  }

  confirmDeleteProduct(product: CandyProduct): void {
    this.itemToDelete.set({
      type: 'product',
      id: product.id,
      name: product.nombre
    });
  }

  // --- Combo Handlers ---
  openNewComboModal(): void {
    this.editingCombo.set(null);
    this.showComboModal.set(true);
  }

  openEditComboModal(combo: Combo): void {
    this.editingCombo.set(combo);
    this.showComboModal.set(true);
  }

  closeComboModal(): void {
    this.showComboModal.set(false);
    this.editingCombo.set(null);
  }

  async saveCombo(data: { nombre: string; precio_fijo: number }): Promise<void> {
    this.isSavingCombo.set(true);
    const combo = this.editingCombo();

    if (combo) {
      const success = await this.candyService.updateCombo(combo.id, data);
      this.isSavingCombo.set(false);
      if (success) {
        this.closeComboModal();
        this.showToastMessage(`Combo "${data.nombre}" actualizado correctamente.`);
      } else {
        this.showToastMessage(this.candyService.error() || 'Error al actualizar combo.', 'error');
      }
    } else {
      const created = await this.candyService.createCombo(data);
      this.isSavingCombo.set(false);
      if (created) {
        this.closeComboModal();
        this.showToastMessage(`Combo "${data.nombre}" creado exitosamente.`);
      } else {
        this.showToastMessage(this.candyService.error() || 'Error al crear combo.', 'error');
      }
    }
  }

  confirmDeleteCombo(combo: Combo): void {
    this.itemToDelete.set({
      type: 'combo',
      id: combo.id,
      name: combo.nombre
    });
  }

  // --- Confirm Deletion ---
  cancelDelete(): void {
    this.itemToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const item = this.itemToDelete();
    if (!item) return;

    this.isDeleting.set(true);
    let success = false;

    if (item.type === 'product') {
      success = await this.candyService.deleteProduct(item.id);
    } else {
      success = await this.candyService.deleteCombo(item.id);
    }

    this.isDeleting.set(false);
    this.itemToDelete.set(null);

    if (success) {
      this.showToastMessage(`"${item.name}" eliminado correctamente.`);
    } else {
      this.showToastMessage(this.candyService.error() || 'Error al eliminar el elemento.', 'error');
    }
  }

  async reload(): Promise<void> {
    await this.candyService.initData();
  }
}
