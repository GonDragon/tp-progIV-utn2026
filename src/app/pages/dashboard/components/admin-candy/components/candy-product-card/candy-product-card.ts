import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandyProduct } from '../../../../../../models/candy';

@Component({
  selector: 'app-candy-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candy-product-card.html'
})
export class CandyProductCard {
  @Input({ required: true }) product!: CandyProduct;
  @Output() edit = new EventEmitter<CandyProduct>();
  @Output() delete = new EventEmitter<CandyProduct>();

  getCategoryIcon(category: string): string {
    switch (category?.toLowerCase()) {
      case 'pochoclos':
        return '🍿';
      case 'bebidas':
        return '🥤';
      case 'snacks':
        return '🥨';
      case 'dulces':
        return '🍫';
      case 'combos':
        return '🎁';
      default:
        return '🍬';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category?.toLowerCase()) {
      case 'pochoclos':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'bebidas':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'snacks':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'dulces':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      case 'combos':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-neutral-800 text-gray-300 border-neutral-700';
    }
  }
}
