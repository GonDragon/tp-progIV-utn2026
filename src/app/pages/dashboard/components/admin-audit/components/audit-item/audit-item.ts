import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditLogEntry } from '../../../../../../models/audit';

@Component({
  selector: 'app-audit-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-item.html',
  styleUrl: './audit-item.css'
})
export class AuditItem {
  readonly log = input.required<AuditLogEntry>();

  getActionIcon(action: string): string {
    switch (action) {
      case 'validar_qr':
        return '📱';
      case 'modificar_precio':
      case 'actualizar_preventa':
        return '💲';
      case 'crear_funcion':
        return '⏰';
      case 'crear_pelicula':
        return '🎬';
      case 'modificar_pelicula':
        return '✏️';
      case 'eliminar_pelicula':
        return '🗑️';
      case 'crear_candy':
      case 'modificar_candy':
      case 'eliminar_candy':
        return '🍿';
      case 'crear_combo':
      case 'modificar_combo':
      case 'eliminar_combo':
        return '🥤';
      case 'crear_cupon':
      case 'modificar_cupon':
      case 'eliminar_cupon':
        return '🎟️';
      case 'venta_transaccion':
        return '💰';
      default:
        return '📝';
    }
  }

  getActionBadgeColor(action: string): string {
    switch (action) {
      case 'validar_qr':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'modificar_precio':
      case 'actualizar_preventa':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'crear_funcion':
      case 'crear_pelicula':
      case 'crear_candy':
      case 'crear_combo':
      case 'crear_cupon':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'eliminar_pelicula':
      case 'eliminar_candy':
      case 'eliminar_combo':
      case 'eliminar_cupon':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  }
}
