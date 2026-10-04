import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CouponService } from '../../../../services/coupon.service';
import { Coupon } from '../../../../models/coupon';
import { CouponCard } from './components/coupon-card/coupon-card';
import { CouponModal } from './components/coupon-modal/coupon-modal';
import { WelcomeDiscountCard } from './components/welcome-discount-card/welcome-discount-card';

@Component({
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CouponCard,
    CouponModal,
    WelcomeDiscountCard
  ],
  templateUrl: './admin-promotions.html',
  styleUrl: './admin-promotions.css'
})
export class AdminPromotions {
  readonly couponService = inject(CouponService);

  readonly searchQuery = signal<string>('');
  readonly selectedRestriction = signal<string>('all');

  readonly restrictions = ['all', 'Ninguna', 'Primera Compra', 'Mayores 50'];

  // Welcome coupon
  readonly welcomeCoupon = computed<Coupon | null>(() => {
    return this.couponService.coupons().find(c =>
      c.tipo_restriccion.toLowerCase().includes('primera') ||
      c.tipo_restriccion.toLowerCase().includes('bienvenida')
    ) || null;
  });

  // Modal State
  readonly showCouponModal = signal(false);
  readonly editingCoupon = signal<Coupon | null>(null);
  readonly isSavingCoupon = signal(false);
  readonly isSavingWelcome = signal(false);

  // Delete State
  readonly couponToDelete = signal<Coupon | null>(null);
  readonly isDeleting = signal(false);

  // Toast
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimer: any = null;

  // Filtered coupons
  readonly filteredCoupons = computed(() => {
    const list = this.couponService.coupons();
    const query = this.searchQuery().trim().toLowerCase();
    const restriction = this.selectedRestriction();

    return list.filter(coupon => {
      const matchRestriction =
        restriction === 'all' ||
        coupon.tipo_restriccion.toLowerCase() === restriction.toLowerCase();

      const matchQuery =
        !query ||
        coupon.codigo.toLowerCase().includes(query) ||
        coupon.tipo_restriccion.toLowerCase().includes(query) ||
        String(coupon.id).includes(query) ||
        String(coupon.porcentaje_descuento).includes(query);

      return matchRestriction && matchQuery;
    });
  });

  private showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  reload(): void {
    this.couponService.loadCoupons();
  }

  // --- Coupon Modal Handlers ---
  openNewCouponModal(): void {
    this.editingCoupon.set(null);
    this.showCouponModal.set(true);
  }

  openEditCouponModal(coupon: Coupon): void {
    this.editingCoupon.set(coupon);
    this.showCouponModal.set(true);
  }

  closeCouponModal(): void {
    this.showCouponModal.set(false);
    this.editingCoupon.set(null);
  }

  async saveCoupon(data: {
    codigo: string;
    porcentaje_descuento: number;
    tipo_restriccion: string;
  }): Promise<void> {
    this.isSavingCoupon.set(true);
    const editing = this.editingCoupon();

    if (editing) {
      const success = await this.couponService.updateCoupon(editing.id, data);
      this.isSavingCoupon.set(false);
      if (success) {
        this.closeCouponModal();
        this.showToastMessage(`Cupón "${data.codigo}" actualizado correctamente.`);
      } else {
        this.showToastMessage(this.couponService.error() || 'Error al actualizar cupón.', 'error');
      }
    } else {
      const created = await this.couponService.createCoupon(data);
      this.isSavingCoupon.set(false);
      if (created) {
        this.closeCouponModal();
        this.showToastMessage(`Cupón "${data.codigo}" creado exitosamente.`);
      } else {
        this.showToastMessage(this.couponService.error() || 'Error al crear cupón.', 'error');
      }
    }
  }

  // --- Delete Handlers ---
  confirmDeleteCoupon(coupon: Coupon): void {
    this.couponToDelete.set(coupon);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.couponToDelete.set(null);
    }
  }

  async executeDelete(): Promise<void> {
    const item = this.couponToDelete();
    if (!item) return;

    this.isDeleting.set(true);
    const success = await this.couponService.deleteCoupon(item.id);
    this.isDeleting.set(false);

    if (success) {
      this.couponToDelete.set(null);
      this.showToastMessage(`Cupón "${item.codigo}" eliminado correctamente.`);
    } else {
      this.showToastMessage(this.couponService.error() || 'Error al eliminar cupón.', 'error');
    }
  }

  // --- Welcome Discount Handler ---
  async saveWelcomeDiscount(percent: number): Promise<void> {
    this.isSavingWelcome.set(true);
    const success = await this.couponService.setWelcomeDiscountPercent(percent);
    this.isSavingWelcome.set(false);

    if (success) {
      this.showToastMessage(`Porcentaje de primera compra establecido al ${percent}%.`);
    } else {
      this.showToastMessage(this.couponService.error() || 'Error al guardar descuento de primera compra.', 'error');
    }
  }
}
