import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { RegisterPersonalForm } from '../registro/components/register-personal-form/register-personal-form';
import { RegisterAccountForm } from '../registro/components/register-account-form/register-account-form';

export type UserRoleOption = 'Administrador' | 'Empleado' | 'Auditor' | 'Cliente';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [
    FormsModule,
    RegisterPersonalForm,
    RegisterAccountForm
  ],
  templateUrl: './crear-usuario.html',
  styleUrl: './crear-usuario.css'
})
export class CrearUsuario {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Available roles as specified: 'Administrador', 'Empleado', 'Auditor', 'Cliente'
  readonly roles: UserRoleOption[] = ['Administrador', 'Empleado', 'Auditor', 'Cliente'];

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
  rol = signal<UserRoleOption>('Empleado');

  // UI state signals
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal(false);
  createdUserName = signal('');
  createdUserRole = signal('');

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!this.authService.isAuthenticated() || !user || user.rol !== 'administrador') {
        this.router.navigate(['/']);
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const nom = this.nombre().trim();
    const ape = this.apellido().trim();
    const mail = this.email().trim();
    const pass = this.password();
    const confPass = this.confirmPassword();
    const selectedRole = this.rol();

    // Validations
    if (!nom || !ape) {
      this.errorMessage.set('Por favor ingrese nombre y apellido del usuario.');
      return;
    }

    if (!mail) {
      this.errorMessage.set('Por favor ingrese el correo electrónico del usuario.');
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

    if (!selectedRole) {
      this.errorMessage.set('Por favor seleccione un rol para el usuario.');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = await this.authService.createUserByAdmin({
        email: mail,
        password: pass,
        nombre: nom,
        apellido: ape,
        rol: selectedRole,
        fecha_nacimiento: this.fechaNacimiento() || undefined,
        tipo_sangre: this.tipoSangre() || undefined,
        color_ojos: this.colorOjos() || undefined,
        dias_vacaciones: this.diasVacaciones()
      });

      if (result.success) {
        this.createdUserName.set(`${nom} ${ape}`);
        this.createdUserRole.set(selectedRole);
        this.successMessage.set(`Usuario "${nom} ${ape}" creado exitosamente con el rol "${selectedRole}".`);

        // Reset form fields
        this.nombre.set('');
        this.apellido.set('');
        this.email.set('');
        this.password.set('');
        this.confirmPassword.set('');
        this.fechaNacimiento.set('2000-01-01');
        this.tipoSangre.set('O+');
        this.colorOjos.set('Marrones');
        this.diasVacaciones.set(14);
        this.rol.set('Empleado');
      } else {
        this.errorMessage.set(result.error || 'No se pudo crear el usuario. Intente nuevamente.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error inesperado durante la creación del usuario.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
