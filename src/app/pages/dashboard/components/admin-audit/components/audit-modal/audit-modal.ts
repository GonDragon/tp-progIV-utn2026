import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditActionType } from '../../../../../../models/audit';

@Component({
  selector: 'app-audit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-modal.html',
  styleUrl: './audit-modal.css'
})
export class AuditModal {
  readonly isOpen = input<boolean>(false);
  readonly isSaving = input<boolean>(false);

  readonly close = output<void>();
  readonly save = output<{
    action: AuditActionType;
    category: string;
    details: string;
  }>();

  selectedAction: AuditActionType = 'general';
  category = 'General';
  details = '';

  readonly availableActions: { value: AuditActionType; label: string; defaultCategory: string }[] = [
    { value: 'general', label: 'Auditoría General / Nota Operativa', defaultCategory: 'General' },
    { value: 'crear_funcion', label: 'Funciones / Horarios', defaultCategory: 'Funciones' },
    { value: 'modificar_precio', label: 'Ajuste de Precios / Tarifas', defaultCategory: 'Precios' },
    { value: 'validar_qr', label: 'Validación de Acceso / Boletos', defaultCategory: 'Control de Acceso' },
    { value: 'crear_pelicula', label: 'Catálogo de Películas', defaultCategory: 'Películas' },
    { value: 'modificar_candy', label: 'Candy Bar & Inventario', defaultCategory: 'Candy Bar' },
    { value: 'crear_cupon', label: 'Promociones & Cupones', defaultCategory: 'Promociones & Cupones' }
  ];

  onActionChange(action: AuditActionType): void {
    this.selectedAction = action;
    const found = this.availableActions.find(a => a.value === action);
    if (found) {
      this.category = found.defaultCategory;
    }
  }

  onSubmit(): void {
    if (!this.details.trim()) return;

    this.save.emit({
      action: this.selectedAction,
      category: this.category.trim() || 'General',
      details: this.details.trim()
    });

    this.details = '';
  }
}
