import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Combo } from '../../../../../../models/candy';

@Component({
  selector: 'app-combo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combo-card.html'
})
export class ComboCard {
  readonly combo = input.required<Combo>();
  readonly edit = output<Combo>();
  readonly delete = output<Combo>();
}
