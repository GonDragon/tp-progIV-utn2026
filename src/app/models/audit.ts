export interface LogActividadDB {
  id: number;
  perfil_id: string | null;
  accion: string;
  fecha_hora: string;
  perfiles?: {
    id: string;
    email?: string;
    nombre?: string;
    apellido?: string;
    rol?: string;
  } | null;
}

export type AuditActionType =
  | 'crear_funcion'
  | 'modificar_precio'
  | 'validar_qr'
  | 'crear_pelicula'
  | 'modificar_pelicula'
  | 'eliminar_pelicula'
  | 'crear_cupon'
  | 'modificar_cupon'
  | 'eliminar_cupon'
  | 'crear_candy'
  | 'modificar_candy'
  | 'eliminar_candy'
  | 'crear_combo'
  | 'modificar_combo'
  | 'eliminar_combo'
  | 'actualizar_preventa'
  | 'venta_transaccion'
  | 'general'
  | string;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail?: string;
  userName: string;
  userRole: string;
  action: AuditActionType;
  category: string;
  details: string;
  rawAccion?: string;
}

export interface AuditStats {
  totalLogs: number;
  adminLogs: number;
  employeeLogs: number;
  todayLogs: number;
  actionCounts: Record<string, number>;
}
