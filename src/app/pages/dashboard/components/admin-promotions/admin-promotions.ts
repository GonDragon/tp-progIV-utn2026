import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { MovieService } from '../../../../services/movie.service';
import { DiscountCoupon } from '../../../../models/admin';
import { Movie } from '../../../../models/movie';

@Component({
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-promotions.html',
  styleUrl: './admin-promotions.css'
})
export class AdminPromotions {
  readonly adminService = inject(AdminService);
  readonly movieService = inject(MovieService);

  readonly activeSubTab = signal<'coupons' | 'presales'>('coupons');

  // Welcome coupon percentage quick update
  welcomePercent = 20;

  // New/edit coupon modal
  readonly showCouponModal = signal(false);
  readonly editingCouponId = signal<string | null>(null);
  couponCode = '';
  couponDiscount = 15;
  couponType: DiscountCoupon['type'] = 'general';
  couponMinAge = 50;
  couponDescription = '';
  couponIsActive = true;

  // Presale configuration modal
  readonly showPresaleModal = signal(false);
  selectedMovieForPresale: Movie | null = null;
  presaleEnabled = true;
  presaleSpecialPrice = 4500;
  presaleStartDate = '';
  presaleEndDate = '';

  constructor() {
    const welcome = this.adminService.discountCoupons().find(c => c.type === 'primera_compra');
    if (welcome) {
      this.welcomePercent = welcome.discountPercent;
    }
  }

  updateWelcomeCoupon(): void {
    this.adminService.updateWelcomeDiscountPercent(Number(this.welcomePercent) || 20);
    alert('¡Porcentaje de primera compra actualizado con éxito!');
  }

  // --- Coupon CRUD ---
  openNewCouponModal(): void {
    this.editingCouponId.set(null);
    this.couponCode = '';
    this.couponDiscount = 15;
    this.couponType = 'general';
    this.couponMinAge = 50;
    this.couponDescription = '';
    this.couponIsActive = true;
    this.showCouponModal.set(true);
  }

  openEditCouponModal(coupon: DiscountCoupon): void {
    this.editingCouponId.set(coupon.id);
    this.couponCode = coupon.code;
    this.couponDiscount = coupon.discountPercent;
    this.couponType = coupon.type;
    this.couponMinAge = coupon.minAge || 50;
    this.couponDescription = coupon.description;
    this.couponIsActive = coupon.isActive;
    this.showCouponModal.set(true);
  }

  closeCouponModal(): void {
    this.showCouponModal.set(false);
    this.editingCouponId.set(null);
  }

  saveCoupon(): void {
    if (!this.couponCode.trim()) return;

    if (this.editingCouponId()) {
      const existing = this.adminService.discountCoupons().find(c => c.id === this.editingCouponId());
      if (existing) {
        this.adminService.updateCoupon({
          ...existing,
          code: this.couponCode.trim().toUpperCase(),
          discountPercent: Number(this.couponDiscount) || 10,
          type: this.couponType,
          minAge: this.couponType === 'mayores_50' ? Number(this.couponMinAge) : undefined,
          description: this.couponDescription.trim(),
          isActive: this.couponIsActive
        });
      }
    } else {
      const newCoupon: DiscountCoupon = {
        id: `dc-${Date.now()}`,
        code: this.couponCode.trim().toUpperCase(),
        discountPercent: Number(this.couponDiscount) || 10,
        type: this.couponType,
        minAge: this.couponType === 'mayores_50' ? Number(this.couponMinAge) : undefined,
        description: this.couponDescription.trim(),
        isActive: this.couponIsActive,
        usageCount: 0
      };
      this.adminService.addCoupon(newCoupon);
    }

    this.closeCouponModal();
  }

  deleteCoupon(coupon: DiscountCoupon): void {
    if (confirm(`¿Eliminar cupón "${coupon.code}"?`)) {
      this.adminService.deleteCoupon(coupon.id);
    }
  }

  // --- Movie Presales (7 days prior with special price) ---
  openPresaleModal(movie: Movie): void {
    this.selectedMovieForPresale = movie;
    this.presaleEnabled = movie.isPresaleEnabled ?? false;
    this.presaleSpecialPrice = movie.presalePrice ?? 4500;

    // Calculate default 7-day prior dates
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    this.presaleStartDate = movie.presaleStartDate || today.toISOString().slice(0, 10);
    this.presaleEndDate = movie.presaleEndDate || futureDate.toISOString().slice(0, 10);

    this.showPresaleModal.set(true);
  }

  closePresaleModal(): void {
    this.showPresaleModal.set(false);
    this.selectedMovieForPresale = null;
  }

  savePresale(): void {
    if (!this.selectedMovieForPresale) return;

    this.movieService.updatePresale(this.selectedMovieForPresale.id, {
      isPresaleEnabled: this.presaleEnabled,
      presalePrice: Number(this.presaleSpecialPrice) || 4500,
      presaleStartDate: this.presaleStartDate,
      presaleEndDate: this.presaleEndDate
    });

    const statusText = this.presaleEnabled ? 'activada' : 'desactivada';
    this.adminService.addAuditLog(
      'modificar_precio',
      'Preventas',
      `Configuración de Preventa ${statusText} para "${this.selectedMovieForPresale.title}": Precio promocional $${this.presaleSpecialPrice} (Ventana: ${this.presaleStartDate} a ${this.presaleEndDate}).`
    );

    this.closePresaleModal();
  }
}
