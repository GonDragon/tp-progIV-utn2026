import { Component, EventEmitter, Output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manual-code-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './manual-code-input.html'
})
export class ManualCodeInput {
  disabled = input<boolean>(false);
  isLoading = input<boolean>(false);

  @Output() submitCode = new EventEmitter<string>();

  code = '';

  onSubmit(): void {
    const trimmed = this.code.trim();
    if (!trimmed || this.disabled() || this.isLoading()) return;

    this.submitCode.emit(trimmed);
  }

  clear(): void {
    this.code = '';
  }
}
