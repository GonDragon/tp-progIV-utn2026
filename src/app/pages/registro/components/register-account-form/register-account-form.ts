import { Component, model, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-account-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register-account-form.html'
})
export class RegisterAccountForm {
  readonly email = model<string>('');
  readonly password = model<string>('');
  readonly confirmPassword = model<string>('');

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  readonly hasMinLength = computed(() => this.password().length >= 6);
  readonly passwordsMatch = computed(() => {
    return this.password().length > 0 && this.password() === this.confirmPassword();
  });

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }
}
