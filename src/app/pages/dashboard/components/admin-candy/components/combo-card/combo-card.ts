import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Combo } from '../../../../../../models/candy';

@Component({
  selector: 'app-combo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combo-card.html'
})
export class ComboCard {
  @Input({ required: true }) combo!: Combo;
  @Output() edit = new EventEmitter<Combo>();
  @Output() delete = new EventEmitter<Combo>();
}
