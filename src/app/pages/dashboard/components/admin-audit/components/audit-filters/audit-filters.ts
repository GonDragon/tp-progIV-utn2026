import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audit-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-filters.html',
  styleUrl: './audit-filters.css'
})
export class AuditFilters {
  readonly selectedCategory = input<string>('todos');
  readonly selectedAction = input<string>('todos');
  readonly selectedRole = input<string>('todos');
  readonly searchQuery = input<string>('');
  readonly startDate = input<string>('');
  readonly endDate = input<string>('');
  readonly resultsCount = input<number>(0);
  readonly totalRecords = input<number>(0);
  readonly isExporting = input<boolean>(false);

  readonly categoryChange = output<string>();
  readonly actionChange = output<string>();
  readonly roleChange = output<string>();
  readonly searchChange = output<string>();
  readonly startDateChange = output<string>();
  readonly endDateChange = output<string>();
  readonly downloadCSV = output<void>();
  readonly downloadXLSX = output<void>();
  readonly resetFilters = output<void>();

  readonly categories = [
    { value: 'todos', label: 'Todas las Categorías' },
    { value: 'Funciones', label: 'Funciones' },
    { value: 'Candy Bar', label: 'Candy Bar' },
    { value: 'Control de Acceso', label: 'Control de Acceso (QR)' },
    { value: 'Películas', label: 'Películas' },
    { value: 'Promociones & Cupones', label: 'Promociones & Cupones' },
    { value: 'Fidelización', label: 'Fidelización' },
    { value: 'Preventas', label: 'Preventas' },
    { value: 'General', label: 'General' }
  ];

  readonly actions = [
    { value: 'todos', label: 'Todas las Acciones' },
    { value: 'crear_funcion', label: 'Crear Función' },
    { value: 'modificar_precio', label: 'Modificar Precio' },
    { value: 'validar_qr', label: 'Validar QR' },
    { value: 'crear_pelicula', label: 'Crear Película' },
    { value: 'modificar_pelicula', label: 'Modificar Película' },
    { value: 'eliminar_pelicula', label: 'Eliminar Película' },
    { value: 'crear_candy', label: 'Crear Candy' },
    { value: 'modificar_candy', label: 'Modificar Candy' },
    { value: 'eliminar_candy', label: 'Eliminar Candy' },
    { value: 'crear_combo', label: 'Crear Combo' },
    { value: 'modificar_combo', label: 'Modificar Combo' },
    { value: 'eliminar_combo', label: 'Eliminar Combo' },
    { value: 'crear_cupon', label: 'Crear Cupón' },
    { value: 'modificar_cupon', label: 'Modificar Cupón' },
    { value: 'eliminar_cupon', label: 'Eliminar Cupón' }
  ];

  readonly roles = [
    { value: 'todos', label: 'Todos los Roles' },
    { value: 'administrador', label: 'Administradores' },
    { value: 'empleado', label: 'Empleados' },
    { value: 'sistema', label: 'Sistema' }
  ];
}
