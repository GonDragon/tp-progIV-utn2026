import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { AuditLogEntry, AuditActionType, AuditStats, LogActividadDB } from '../models/audit';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  private readonly _logs = signal<AuditLogEntry[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly logs = this._logs.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly stats = computed<AuditStats>(() => {
    const list = this._logs();
    const todayStr = new Date().toISOString().split('T')[0];

    let adminCount = 0;
    let employeeCount = 0;
    let todayCount = 0;
    const actionCounts: Record<string, number> = {};

    list.forEach(log => {
      if (log.userRole.toLowerCase().includes('admin')) {
        adminCount++;
      } else if (log.userRole.toLowerCase().includes('emplead')) {
        employeeCount++;
      }

      if (log.timestamp.startsWith(todayStr)) {
        todayCount++;
      }

      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    return {
      totalLogs: list.length,
      adminLogs: adminCount,
      employeeLogs: employeeCount,
      todayLogs: todayCount,
      actionCounts
    };
  });

  constructor() {
    this.loadLogs();
  }

  /**
   * Carga el registro inmutable de auditoría directamente desde Supabase
   */
  async loadLogs(): Promise<AuditLogEntry[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // 1. Intentar consulta con JOIN a perfiles
      const { data, error } = await this.supabase.client
        .from('log_actividad')
        .select(`
          id,
          perfil_id,
          accion,
          fecha_hora,
          perfiles (
            id,
            email,
            nombre,
            apellido,
            rol
          )
        `)
        .order('fecha_hora', { ascending: false });

      if (error) {
        console.warn('Error en join con perfiles para log_actividad, intentando carga simple:', error.message);
        // Fallback a consulta simple si hay problema con la relación en Supabase
        return await this.loadLogsSimpleFallback();
      }

      const parsedLogs: AuditLogEntry[] = (data || []).map((row: any) => this.mapRowToEntry(row));
      this._logs.set(parsedLogs);
      return parsedLogs;
    } catch (err: any) {
      console.error('Error al conectar con Supabase para auditoría:', err);
      this._error.set(err.message || 'Error de conexión con la base de datos de auditoría');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  private async loadLogsSimpleFallback(): Promise<AuditLogEntry[]> {
    try {
      const [logsRes, profilesRes] = await Promise.all([
        this.supabase.client
          .from('log_actividad')
          .select('id, perfil_id, accion, fecha_hora')
          .order('fecha_hora', { ascending: false }),
        this.supabase.client
          .from('perfiles')
          .select('id, email, nombre, apellido, rol')
      ]);

      if (logsRes.error) {
        this._error.set(logsRes.error.message);
        return [];
      }

      const profileMap = new Map<string, any>();
      (profilesRes.data || []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, p);
      });

      const parsed: AuditLogEntry[] = (logsRes.data || []).map((row: any) => {
        const perf = row.perfil_id ? profileMap.get(row.perfil_id) : null;
        return this.mapRowToEntry({ ...row, perfiles: perf });
      });

      this._logs.set(parsed);
      return parsed;
    } catch (e: any) {
      console.error('Error en fallback de auditoría:', e);
      this._error.set(e.message || 'Error al procesar logs');
      return [];
    }
  }

  /**
   * Guarda una nueva entrada de auditoría en la tabla log_actividad de Supabase
   */
  async log(
    action: AuditActionType,
    category: string,
    details: string,
    perfilId?: string | null
  ): Promise<boolean> {
    try {
      const currentUser = this.authService.currentUser();
      const targetPerfilId = perfilId !== undefined ? perfilId : (currentUser?.id || null);

      // Formato estructurado para la columna `accion`
      const formattedAccion = `[${action}] [${category}] ${details}`;
      const nowIso = new Date().toISOString();

      const { data, error } = await this.supabase.client
        .from('log_actividad')
        .insert({
          perfil_id: targetPerfilId,
          accion: formattedAccion,
          fecha_hora: nowIso
        })
        .select(`
          id,
          perfil_id,
          accion,
          fecha_hora,
          perfiles (
            id,
            email,
            nombre,
            apellido,
            rol
          )
        `)
        .single();

      if (error) {
        console.error('Error al insertar log de auditoría en Supabase:', error);
        // Aunque falle la respuesta select con join, podemos intentar insert simple
        const fallbackInsert = await this.supabase.client
          .from('log_actividad')
          .insert({
            perfil_id: targetPerfilId,
            accion: formattedAccion,
            fecha_hora: nowIso
          });

        if (fallbackInsert.error) {
          console.error('Error fatal al guardar log:', fallbackInsert.error);
          return false;
        }
      }

      // Optimistic or synced update
      const newEntry: AuditLogEntry = data
        ? this.mapRowToEntry(data)
        : {
            id: `log-${Date.now()}`,
            timestamp: this.formatTimestamp(nowIso),
            userId: targetPerfilId || 'anon',
            userEmail: currentUser?.email,
            userName: currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : 'Usuario del Sistema',
            userRole: currentUser?.rol || 'administrador',
            action,
            category,
            details,
            rawAccion: formattedAccion
          };

      this._logs.update(current => [newEntry, ...current]);
      return true;
    } catch (err: any) {
      console.error('Excepción al registrar auditoría:', err);
      return false;
    }
  }

  /**
   * Convierte un registro de Supabase al modelo AuditLogEntry
   */
  private mapRowToEntry(row: any): AuditLogEntry {
    const rawAccion: string = row.accion || '';
    const { action, category, details } = this.parseAccionString(rawAccion);

    const perfil = Array.isArray(row.perfiles) ? row.perfiles[0] : row.perfiles;
    let userName = 'Usuario del Sistema';
    let userRole = 'administrador';
    let userEmail: string | undefined = undefined;

    if (perfil) {
      userName = `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() || perfil.email || 'Usuario';
      userRole = perfil.rol || 'administrador';
      userEmail = perfil.email;
    } else if (row.perfil_id) {
      userName = `Usuario (#${String(row.perfil_id).slice(0, 6)})`;
    }

    return {
      id: String(row.id),
      timestamp: this.formatTimestamp(row.fecha_hora),
      userId: row.perfil_id || 'anon',
      userEmail,
      userName,
      userRole,
      action: action as AuditActionType,
      category,
      details,
      rawAccion
    };
  }

  /**
   * Parsea el texto del campo accion:
   * Ejemplo 1: "[crear_funcion] [Funciones] Programó función..."
   * Ejemplo 2: JSON '{"action":"...","category":"...","details":"..."}'
   * Ejemplo 3: Texto libre "Validó entrada QR #TKT-1234"
   */
  private parseAccionString(raw: string): { action: AuditActionType; category: string; details: string } {
    if (!raw) {
      return { action: 'general', category: 'General', details: 'Acción registrada' };
    }

    // Caso 1: JSON
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        return {
          action: parsed.action || 'general',
          category: parsed.category || 'General',
          details: parsed.details || parsed.descripcion || raw
        };
      } catch {
        // Ignorar y seguir
      }
    }

    // Caso 2: Formato "[accion] [categoria] detalle" o "[accion] detalle"
    const matchTwoBrackets = raw.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
    if (matchTwoBrackets) {
      return {
        action: matchTwoBrackets[1].trim() as AuditActionType,
        category: matchTwoBrackets[2].trim(),
        details: matchTwoBrackets[3].trim()
      };
    }

    const matchOneBracket = raw.match(/^\[(.*?)\]\s*(.*)$/);
    if (matchOneBracket) {
      const act = matchOneBracket[1].trim();
      return {
        action: act as AuditActionType,
        category: this.inferCategory(act, matchOneBracket[2]),
        details: matchOneBracket[2].trim()
      };
    }

    // Caso 3: Texto plano inferido
    return {
      action: this.inferActionType(raw),
      category: this.inferCategory('', raw),
      details: raw
    };
  }

  private inferActionType(text: string): AuditActionType {
    const lower = text.toLowerCase();
    if (lower.includes('qr') || lower.includes('valid') || lower.includes('acceso')) return 'validar_qr';
    if (lower.includes('precio') || lower.includes('costo') || lower.includes('descuento') || lower.includes('puntos')) return 'modificar_precio';
    if (lower.includes('función') || lower.includes('funcion') || lower.includes('horario') || lower.includes('sala')) return 'crear_funcion';
    if (lower.includes('cupón') || lower.includes('cupon') || lower.includes('promo')) return 'crear_cupon';
    if (lower.includes('película') || lower.includes('pelicula')) {
      if (lower.includes('eliminar') || lower.includes('borró') || lower.includes('eliminó')) return 'eliminar_pelicula';
      if (lower.includes('actualiz') || lower.includes('modific') || lower.includes('edit')) return 'modificar_pelicula';
      return 'crear_pelicula';
    }
    if (lower.includes('candy') || lower.includes('combo') || lower.includes('pochoclo') || lower.includes('snack')) {
      if (lower.includes('combo')) return 'crear_combo';
      return 'modificar_candy';
    }
    return 'general';
  }

  private inferCategory(action: string, text: string): string {
    const actLower = (action || '').toLowerCase();
    const txtLower = (text || '').toLowerCase();

    if (actLower.includes('funcion') || txtLower.includes('función') || txtLower.includes('funcion') || txtLower.includes('horario')) return 'Funciones';
    if (actLower.includes('qr') || txtLower.includes('qr') || txtLower.includes('boleto') || txtLower.includes('ticket')) return 'Control de Acceso';
    if (actLower.includes('candy') || txtLower.includes('candy') || txtLower.includes('combo') || txtLower.includes('snack')) return 'Candy Bar';
    if (actLower.includes('cupon') || txtLower.includes('cupon') || txtLower.includes('descuento') || txtLower.includes('promoción') || txtLower.includes('promocion')) return 'Promociones & Cupones';
    if (actLower.includes('pelicula') || txtLower.includes('película') || txtLower.includes('pelicula') || txtLower.includes('poster')) return 'Películas';
    if (txtLower.includes('fidelización') || txtLower.includes('puntos')) return 'Fidelización';
    if (txtLower.includes('preventa')) return 'Preventas';
    return 'General';
  }

  private formatTimestamp(isoOrDate: string): string {
    if (!isoOrDate) return new Date().toISOString();
    try {
      const d = new Date(isoOrDate);
      if (isNaN(d.getTime())) return String(isoOrDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      const seconds = pad(d.getSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch {
      return String(isoOrDate);
    }
  }
}
