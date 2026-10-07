import { Component, input } from '@angular/core';

@Component({
  selector: 'app-register-header',
  standalone: true,
  templateUrl: './register-header.html'
})
export class RegisterHeader {
  readonly welcomeDiscount = input<number | null>(null);
  readonly welcomeCode = input<string | null>(null);
}
