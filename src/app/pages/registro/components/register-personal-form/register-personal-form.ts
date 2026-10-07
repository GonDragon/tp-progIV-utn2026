import { Component, model, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-personal-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register-personal-form.html'
})
export class RegisterPersonalForm {
  readonly nombre = model<string>('');
  readonly apellido = model<string>('');
  readonly fechaNacimiento = model<string>('');
  readonly tipoSangre = model<string>('O+');
  readonly colorOjos = model<string>('Marrones');
  readonly diasVacaciones = model<number>(14);

  readonly bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly eyeColors = ['Marrones', 'Azules', 'Verdes', 'Miel / Castaños', 'Negros', 'Grises', 'Otros'];
  readonly vacationPresets = [14, 21, 28, 35];

  // Friendly date selector fields
  readonly selectedDay = signal<number>(1);
  readonly selectedMonth = signal<number>(1);
  readonly selectedYear = signal<number>(2000);

  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  readonly years = Array.from({ length: 105 }, (_, i) => 2026 - i);

  constructor() {
    effect(() => {
      const val = this.fechaNacimiento();
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-').map(Number);
        if (y && m && d) {
          this.selectedYear.set(y);
          this.selectedMonth.set(m);
          this.selectedDay.set(d);
        }
      }
    });
  }

  readonly calculatedAge = computed(() => {
    const fn = this.fechaNacimiento();
    if (!fn) return null;
    const birthDate = new Date(fn);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  });

  onDatePartsChange(): void {
    const y = this.selectedYear();
    const m = String(this.selectedMonth()).padStart(2, '0');
    const d = String(this.selectedDay()).padStart(2, '0');
    this.fechaNacimiento.set(`${y}-${m}-${d}`);
  }

  onDirectDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.fechaNacimiento.set(input.value);
    }
  }

  setBloodType(type: string): void {
    this.tipoSangre.set(type);
  }

  setColorOjos(color: string): void {
    this.colorOjos.set(color);
  }

  adjustVacation(delta: number): void {
    const current = Number(this.diasVacaciones()) || 0;
    const next = Math.max(0, current + delta);
    this.diasVacaciones.set(next);
  }

  setVacationPreset(days: number): void {
    this.diasVacaciones.set(days);
  }
}
