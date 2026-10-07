import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-register-success-modal',
  standalone: true,
  templateUrl: './register-success-modal.html'
})
export class RegisterSuccessModal {
  readonly isOpen = input<boolean>(false);
  readonly userName = input<string>('');
  readonly welcomeDiscount = input<number | null>(null);
  readonly welcomeCode = input<string | null>(null);

  readonly close = output<void>();

  onContinue(): void {
    this.close.emit();
  }
}
