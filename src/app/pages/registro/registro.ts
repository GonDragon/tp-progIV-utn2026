import { Component, inject, effect, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { CouponService } from '../../services/coupon.service';
import { RegisterHeader } from './components/register-header/register-header';
import { RegisterPersonalForm } from './components/register-personal-form/register-personal-form';
import { RegisterAccountForm } from './components/register-account-form/register-account-form';
import { RegisterSuccessModal } from './components/register-success-modal/register-success-modal';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    FormsModule,
    RegisterHeader,
    RegisterPersonalForm,
    RegisterAccountForm,
    RegisterSuccessModal
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly couponService = inject(CouponService);

  // Form Signals
  nombre = signal('');
  apellido = signal('');
  fechaNacimiento = signal('2000-01-01');
  tipoSangre = signal('O+');
  colorOjos = signal('Marrones');
  diasVacaciones = signal(14);
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  // UI state signals
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  showSuccessModal = signal(false);
  registeredUserName = signal('');

  readonly welcomeCoupon = computed(() => {
    return this.couponService.coupons().find(c => c.tipo_restriccion === 'Primera Compra') || null;
  });

  readonly welcomeDiscount = computed(() => {
    return this.welcomeCoupon()?.porcentaje_descuento ?? null;
  });

  readonly welcomeCode = computed(() => {
    return this.welcomeCoupon()?.codigo ?? null;
  });

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        const user = this.authService.currentUser();
        if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);

    const nom = this.nombre().trim();
    const ape = this.apellido().trim();
    const mail = this.email().trim();
    const pass = this.password();
    const confPass = this.confirmPassword();

    // Validations
    if (!nom || !ape) {
      this.errorMessage.set('Por favor ingrese su nombre y apellido.');
      return;
    }

    if (!mail) {
      this.errorMessage.set('Por favor ingrese su correo electrónico.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      this.errorMessage.set('Por favor ingrese un formato de correo electrónico válido.');
      return;
    }

    if (!pass || pass.length < 6) {
      this.errorMessage.set('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (pass !== confPass) {
      this.errorMessage.set('Las contraseñas no coinciden. Por favor verifique.');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = await this.authService.register({
        email: mail,
        password: pass,
        nombre: nom,
        apellido: ape,
        fecha_nacimiento: this.fechaNacimiento() || undefined,
        tipo_sangre: this.tipoSangre() || undefined,
        color_ojos: this.colorOjos() || undefined,
        dias_vacaciones: this.diasVacaciones()
      });

      if (result.success) {
        this.registeredUserName.set(nom);
        this.showSuccessModal.set(true);
      } else {
        this.errorMessage.set(result.error || 'No se pudo completar el registro. Intente nuevamente.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error inesperado durante el registro.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSuccessModalClose(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
