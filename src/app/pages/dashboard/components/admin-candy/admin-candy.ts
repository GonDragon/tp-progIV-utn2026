import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { CandyProduct, SpecialCombo, LoyaltyReward } from '../../../../models/admin';

@Component({
  selector: 'app-admin-candy',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-candy.html',
  styleUrl: './admin-candy.css'
})
export class AdminCandy {
  readonly adminService = inject(AdminService);

  readonly activeTab = signal<'products' | 'combos' | 'rewards'>('products');

  // Product modal & form
  readonly showProductModal = signal(false);
  readonly editingProductId = signal<string | null>(null);
  productName = '';
  productCategory: CandyProduct['category'] = 'Pochoclos';
  productPrice = 4500;
  productPointsCost = 4000;
  productDescription = '';
  productColor = '#f59e0b';

  // Combo modal & form
  readonly showComboModal = signal(false);
  readonly editingComboId = signal<string | null>(null);
  comboName = '';
  comboDescription = '';
  comboTicketCount = 2;
  comboIncludedItemsText = '1x Balde Pochoclos Gigante\n2x Gaseosa Grande 750ml';
  comboFixedPrice = 14500;
  comboPointsCost = 11000;

  // Reward modal & form
  readonly showRewardModal = signal(false);
  readonly editingRewardId = signal<string | null>(null);
  rewardName = '';
  rewardType: 'ticket' | 'candy' | 'combo' = 'candy';
  rewardPointsCost = 4500;
  rewardDescription = '';

  readonly colorPresets = [
    '#f59e0b', '#d97706', '#dc2626', '#0284c7', '#ca8a04', '#7c2d12', '#16a34a', '#9333ea'
  ];

  // --- Product Handlers ---
  openNewProductModal(): void {
    this.editingProductId.set(null);
    this.productName = '';
    this.productCategory = 'Pochoclos';
    this.productPrice = 4500;
    this.productPointsCost = 4000;
    this.productDescription = '';
    this.productColor = '#f59e0b';
    this.showProductModal.set(true);
  }

  openEditProductModal(prod: CandyProduct): void {
    this.editingProductId.set(prod.id);
    this.productName = prod.name;
    this.productCategory = prod.category;
    this.productPrice = prod.price;
    this.productPointsCost = prod.pointsCost;
    this.productDescription = prod.description;
    this.productColor = prod.placeholderColor;
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
    this.editingProductId.set(null);
  }

  saveProduct(): void {
    if (!this.productName.trim()) return;

    if (this.editingProductId()) {
      const existing = this.adminService.candyProducts().find(p => p.id === this.editingProductId());
      if (existing) {
        this.adminService.updateCandyProduct({
          ...existing,
          name: this.productName.trim(),
          category: this.productCategory,
          price: Number(this.productPrice) || 0,
          pointsCost: Number(this.productPointsCost) || 0,
          description: this.productDescription.trim(),
          placeholderColor: this.productColor
        });
      }
    } else {
      const newProd: CandyProduct = {
        id: `cp-${Date.now()}`,
        name: this.productName.trim(),
        category: this.productCategory,
        price: Number(this.productPrice) || 0,
        pointsCost: Number(this.productPointsCost) || 0,
        description: this.productDescription.trim(),
        placeholderColor: this.productColor,
        isAvailable: true,
        salesCount: 0
      };
      this.adminService.addCandyProduct(newProd);
    }

    this.closeProductModal();
  }

  deleteProduct(prod: CandyProduct): void {
    if (confirm(`¿Eliminar producto "${prod.name}" del Candy Bar?`)) {
      this.adminService.deleteCandyProduct(prod.id);
    }
  }

  // --- Combo Handlers ---
  openNewComboModal(): void {
    this.editingComboId.set(null);
    this.comboName = '';
    this.comboDescription = '';
    this.comboTicketCount = 2;
    this.comboIncludedItemsText = '1x Balde Pochoclos Gigante\n2x Gaseosa Grande 750ml';
    this.comboFixedPrice = 14500;
    this.comboPointsCost = 11000;
    this.showComboModal.set(true);
  }

  openEditComboModal(combo: SpecialCombo): void {
    this.editingComboId.set(combo.id);
    this.comboName = combo.name;
    this.comboDescription = combo.description;
    this.comboTicketCount = combo.ticketCount;
    this.comboIncludedItemsText = combo.includedItems.join('\n');
    this.comboFixedPrice = combo.fixedPrice;
    this.comboPointsCost = combo.pointsCost || 10000;
    this.showComboModal.set(true);
  }

  closeComboModal(): void {
    this.showComboModal.set(false);
    this.editingComboId.set(null);
  }

  saveCombo(): void {
    if (!this.comboName.trim()) return;

    const items = this.comboIncludedItemsText
      .split('\n')
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (this.editingComboId()) {
      const existing = this.adminService.specialCombos().find(c => c.id === this.editingComboId());
      if (existing) {
        this.adminService.updateSpecialCombo({
          ...existing,
          name: this.comboName.trim(),
          description: this.comboDescription.trim(),
          ticketCount: Number(this.comboTicketCount) || 1,
          includedItems: items,
          fixedPrice: Number(this.comboFixedPrice) || 0,
          pointsCost: Number(this.comboPointsCost) || 0
        });
      }
    } else {
      const newCombo: SpecialCombo = {
        id: `sc-${Date.now()}`,
        name: this.comboName.trim(),
        description: this.comboDescription.trim(),
        ticketCount: Number(this.comboTicketCount) || 1,
        includedItems: items,
        fixedPrice: Number(this.comboFixedPrice) || 0,
        pointsCost: Number(this.comboPointsCost) || 0,
        isActive: true
      };
      this.adminService.addSpecialCombo(newCombo);
    }

    this.closeComboModal();
  }

  deleteCombo(combo: SpecialCombo): void {
    if (confirm(`¿Eliminar combo "${combo.name}"?`)) {
      this.adminService.deleteSpecialCombo(combo.id);
    }
  }

  // --- Rewards Handlers ---
  openNewRewardModal(): void {
    this.editingRewardId.set(null);
    this.rewardName = '';
    this.rewardType = 'candy';
    this.rewardPointsCost = 4500;
    this.rewardDescription = '';
    this.showRewardModal.set(true);
  }

  openEditRewardModal(reward: LoyaltyReward): void {
    this.editingRewardId.set(reward.id);
    this.rewardName = reward.name;
    this.rewardType = reward.type;
    this.rewardPointsCost = reward.pointsCost;
    this.rewardDescription = reward.description;
    this.showRewardModal.set(true);
  }

  closeRewardModal(): void {
    this.showRewardModal.set(false);
    this.editingRewardId.set(null);
  }

  saveReward(): void {
    if (!this.rewardName.trim()) return;

    if (this.editingRewardId()) {
      const existing = this.adminService.loyaltyRewards().find(r => r.id === this.editingRewardId());
      if (existing) {
        this.adminService.updateLoyaltyReward({
          ...existing,
          name: this.rewardName.trim(),
          type: this.rewardType,
          pointsCost: Number(this.rewardPointsCost) || 0,
          description: this.rewardDescription.trim()
        });
      }
    } else {
      const newReward: LoyaltyReward = {
        id: `lr-${Date.now()}`,
        name: this.rewardName.trim(),
        type: this.rewardType,
        pointsCost: Number(this.rewardPointsCost) || 0,
        description: this.rewardDescription.trim(),
        isActive: true
      };
      this.adminService.addLoyaltyReward(newReward);
    }

    this.closeRewardModal();
  }

  deleteReward(reward: LoyaltyReward): void {
    if (confirm(`¿Eliminar recompensa "${reward.name}"?`)) {
      this.adminService.deleteLoyaltyReward(reward.id);
    }
  }
}
