import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { AuditLogEntry, AuditActionType, AuditStats, LogActividadDB } from '../models/audit';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  private readonly _logs = signal<AuditLogEntry[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isExporting = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  private readonly _currentPage = signal<number>(1);
  private readonly _pageSize = signal<number>(10);
  private readonly _totalRecords = signal<number>(0);
  private readonly _startDate = signal<string>('');
  private readonly _endDate = signal<string>('');

  readonly logs = this._logs.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isExporting = this._isExporting.asReadonly();
  readonly error = this._error.asReadonly();

  readonly currentPage = this._currentPage.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly totalRecords = this._totalRecords.asReadonly();
  readonly startDate = this._startDate.asReadonly();
  readonly endDate = this._endDate.asReadonly();

  readonly totalPages = computed<number>(() => {
    const total = this._totalRecords();
    const size = this._pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  readonly stats = computed<AuditStats>(() => {
    const list = this._logs();
    const total = this._totalRecords() || list.length;
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
      totalLogs: total,
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
   * con paginación de 10 registros por página, orden descendente (más reciente arriba),
   * y filtros opcionales de fecha inicio y fecha fin.
   */
  async loadLogs(
    page: number = this._currentPage(),
    startDate: string = this._startDate(),
    endDate: string = this._endDate()
  ): Promise<AuditLogEntry[]> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentPage.set(page);
    this._startDate.set(startDate);
    this._endDate.set(endDate);

    const pageSize = this._pageSize();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      // 1. Intentar consulta con JOIN a perfiles
      let query = this.supabase.client
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
        `, { count: 'exact' });

      if (startDate && startDate.trim()) {
        const startIso = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
        query = query.gte('fecha_hora', startIso);
      }

      if (endDate && endDate.trim()) {
        const endIso = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`;
        query = query.lte('fecha_hora', endIso);
      }

      query = query
        .order('fecha_hora', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.warn('Error en join con perfiles para log_actividad, intentando carga simple:', error.message);
        return await this.loadLogsSimpleFallback(page, startDate, endDate);
      }

      const parsedLogs: AuditLogEntry[] = (data || []).map((row: any) => this.mapRowToEntry(row));
      this._totalRecords.set(count ?? parsedLogs.length);
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

  private async loadLogsSimpleFallback(
    page: number,
    startDate: string,
    endDate: string
  ): Promise<AuditLogEntry[]> {
    const pageSize = this._pageSize();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let logsQuery = this.supabase.client
        .from('log_actividad')
        .select('id, perfil_id, accion, fecha_hora', { count: 'exact' });

      if (startDate && startDate.trim()) {
        const startIso = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
        logsQuery = logsQuery.gte('fecha_hora', startIso);
      }

      if (endDate && endDate.trim()) {
        const endIso = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`;
        logsQuery = logsQuery.lte('fecha_hora', endIso);
      }

      logsQuery = logsQuery
        .order('fecha_hora', { ascending: false })
        .range(from, to);

      const [logsRes, profilesRes] = await Promise.all([
        logsQuery,
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

      this._totalRecords.set(logsRes.count ?? parsed.length);
      this._logs.set(parsed);
      return parsed;
    } catch (e: any) {
      console.error('Error en fallback de auditoría:', e);
      this._error.set(e.message || 'Error al procesar logs');
      return [];
    }
  }

  /**
   * Obtiene TODOS los logs que cumplen con el filtro de fechas (sin paginar),
   * ordenados del más reciente al más antiguo, para ser descargados como CSV o XLSX.
   */
  async fetchLogsForExport(
    startDate: string = this._startDate(),
    endDate: string = this._endDate()
  ): Promise<AuditLogEntry[]> {
    this._isExporting.set(true);

    try {
      let query = this.supabase.client
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

      if (startDate && startDate.trim()) {
        const startIso = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
        query = query.gte('fecha_hora', startIso);
      }

      if (endDate && endDate.trim()) {
        const endIso = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`;
        query = query.lte('fecha_hora', endIso);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error en join con perfiles para exportar logs, intentando carga simple:', error.message);
        return await this.fetchLogsForExportFallback(startDate, endDate);
      }

      return (data || []).map((row: any) => this.mapRowToEntry(row));
    } catch (err: any) {
      console.error('Error al obtener logs para exportación:', err);
      throw err;
    } finally {
      this._isExporting.set(false);
    }
  }

  private async fetchLogsForExportFallback(
    startDate: string,
    endDate: string
  ): Promise<AuditLogEntry[]> {
    try {
      let logsQuery = this.supabase.client
        .from('log_actividad')
        .select('id, perfil_id, accion, fecha_hora');

      if (startDate && startDate.trim()) {
        const startIso = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
        logsQuery = logsQuery.gte('fecha_hora', startIso);
      }

      if (endDate && endDate.trim()) {
        const endIso = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`;
        logsQuery = logsQuery.lte('fecha_hora', endIso);
      }

      logsQuery = logsQuery.order('fecha_hora', { ascending: false });

      const [logsRes, profilesRes] = await Promise.all([
        logsQuery,
        this.supabase.client
          .from('perfiles')
          .select('id, email, nombre, apellido, rol')
      ]);

      if (logsRes.error) {
        throw new Error(logsRes.error.message);
      }

      const profileMap = new Map<string, any>();
      (profilesRes.data || []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, p);
      });

      return (logsRes.data || []).map((row: any) => {
        const perf = row.perfil_id ? profileMap.get(row.perfil_id) : null;
        return this.mapRowToEntry({ ...row, perfiles: perf });
      });
    } catch (e: any) {
      console.error('Error en fallback de exportación:', e);
      throw e;
    }
  }

  /**
   * Exporta una lista de logs a formato CSV y descarga el archivo.
   */
  exportToCSV(logs: AuditLogEntry[], filenamePrefix: string = 'auditoria_logs'): void {
    const headers = ['ID', 'Fecha y Hora', 'Usuario', 'Email', 'Rol', 'Categoría', 'Acción', 'Detalles'];
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map(l => [
      escapeCsv(l.id),
      escapeCsv(l.timestamp),
      escapeCsv(l.userName),
      escapeCsv(l.userEmail || ''),
      escapeCsv(l.userRole),
      escapeCsv(l.category),
      escapeCsv(l.action),
      escapeCsv(l.details)
    ].join(','));

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta una lista de logs a formato XLSX (Excel) y descarga el archivo.
   */
  exportToXLSX(logs: AuditLogEntry[], filenamePrefix: string = 'auditoria_logs'): void {
    const data = logs.map(l => ({
      'ID': l.id,
      'Fecha y Hora': l.timestamp,
      'Usuario': l.userName,
      'Email': l.userEmail || '',
      'Rol': l.userRole,
      'Categoría': l.category,
      'Acción': l.action,
      'Detalles': l.details
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs de Auditoria');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
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

      // Recargar la primera página para mantener sincronía y conteo exacto
      await this.loadLogs(1, this._startDate(), this._endDate());
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
