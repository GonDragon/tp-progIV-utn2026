import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { PushNotificationService } from './push-notification.service';
import { AuditService } from './audit.service';
import { UserWaitlistItem, WaitlistStatus } from '../models/waitlist';
import { Movie, Schedule } from '../models/movie';

@Injectable({
  providedIn: 'root'
})
export class WaitlistService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly pushService = inject(PushNotificationService);
  private readonly auditService = inject(AuditService);

  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Registers current authenticated user into the waitlist for a specific function.
   */
  async joinWaitlist(funcionId: number): Promise<{
    success: boolean;
    message: string;
    position?: number;
    waitlistId?: number;
  }> {
    const user = this.authService.currentUser();
    if (!user) {
      return {
        success: false,
        message: 'Debes iniciar sesión con una cuenta de cliente para anotarte en la lista de espera.'
      };
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      // 1. Check if user is already enrolled
      const { data: existing, error: checkError } = await this.supabase.client
        .from('lista_espera')
        .select('id, estado, fecha_inscripcion')
        .eq('funcion_id', funcionId)
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Error al verificar lista de espera:', checkError.message);
      }

      if (existing) {
        if (existing.estado === 'en_espera' || existing.estado === 'notificado') {
          const pos = await this.getUserPositionInWaitlist(funcionId, user.id);
          return {
            success: true,
            message: `Ya estás anotado en la lista de espera para esta función en la posición #${pos || 1}.`,
            position: pos || 1,
            waitlistId: existing.id
          };
        } else {
          // Re-activate if was expired/cancelled
          const nowIso = new Date().toISOString();
          const { data: updated, error: updateError } = await this.supabase.client
            .from('lista_espera')
            .update({
              estado: 'en_espera',
              fecha_inscripcion: nowIso,
              notificado_en: null,
              expira_en: null
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(`Error al reactivar en lista de espera: ${updateError.message}`);
          }

          const pos = await this.getUserPositionInWaitlist(funcionId, user.id);

          this.auditService.log(
            'lista_espera_ingreso',
            'Lista de Espera',
            `El usuario ${user.nombre} ${user.apellido} (${user.email}) se anotó en la lista de espera de la función #${funcionId} (Posición #${pos || 1}).`
          );

          return {
            success: true,
            message: `¡Te has anotado exitosamente en la lista de espera! Estás en la posición #${pos || 1}.`,
            position: pos || 1,
            waitlistId: existing.id
          };
        }
      }

      // 2. Insert new record
      const nowIso = new Date().toISOString();
      const { data: inserted, error: insertError } = await this.supabase.client
        .from('lista_espera')
        .insert({
          funcion_id: funcionId,
          perfil_id: user.id,
          estado: 'en_espera',
          fecha_inscripcion: nowIso
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Error al registrarse en lista de espera: ${insertError.message}`);
      }

      const pos = await this.getUserPositionInWaitlist(funcionId, user.id);

      this.auditService.log(
        'lista_espera_ingreso',
        'Lista de Espera',
        `El usuario ${user.nombre} ${user.apellido} (${user.email}) se anotó en la lista de espera de la función #${funcionId} (Posición #${pos || 1}).`
      );

      return {
        success: true,
        message: `¡Te has anotado exitosamente en la lista de espera! Estás en la posición #${pos || 1}.`,
        position: pos || 1,
        waitlistId: inserted.id
      };
    } catch (err: any) {
      console.error('Error al unirse a la lista de espera:', err);
      const msg = err.message || 'Error al anotarse en la lista de espera.';
      this._error.set(msg);
      return { success: false, message: msg };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Removes user from waitlist for a specific function.
   */
  async leaveWaitlist(funcionId: number, perfilId?: string): Promise<{ success: boolean; message: string }> {
    const userId = perfilId || this.authService.currentUser()?.id;
    if (!userId) {
      return { success: false, message: 'Usuario no autenticado.' };
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const { error } = await this.supabase.client
        .from('lista_espera')
        .delete()
        .eq('funcion_id', funcionId)
        .eq('perfil_id', userId);

      if (error) {
        throw new Error(`Error al salir de la lista de espera: ${error.message}`);
      }

      const user = this.authService.currentUser();
      const userName = user ? `${user.nombre} ${user.apellido}` : 'Usuario';
      this.auditService.log(
        'lista_espera_salida',
        'Lista de Espera',
        `${userName} salió de la lista de espera para la función #${funcionId}.`
      );

      return {
        success: true,
        message: 'Has salido de la lista de espera exitosamente.'
      };
    } catch (err: any) {
      console.error('Error al salir de la lista de espera:', err);
      const msg = err.message || 'Error al salir de la lista de espera.';
      this._error.set(msg);
      return { success: false, message: msg };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Retrieves active waitlist items for a user, enriched with position, movie and schedule data.
   */
  async getUserWaitlists(perfilId?: string): Promise<UserWaitlistItem[]> {
    const userId = perfilId || this.authService.currentUser()?.id;
    if (!userId) {
      return [];
    }

    try {
      // First, expire any outdated notification windows
      await this.checkAndAdvanceExpiredWaitlists();

      const { data, error } = await this.supabase.client
        .from('lista_espera')
        .select(`
          id,
          funcion_id,
          perfil_id,
          estado,
          fecha_inscripcion,
          notificado_en,
          expira_en,
          funciones:funcion_id (
            id,
            pelicula_id,
            sala_id,
            fecha_hora_inicio,
            formato,
            idioma,
            precio_base,
            en_preventa,
            precio_preventa,
            salas:sala_id (
              id,
              nombre
            ),
            peliculas:pelicula_id (
              id,
              nombre,
              imagen_url,
              duracion_minutos,
              restriccion_edad,
              sinopsis
            )
          )
        `)
        .eq('perfil_id', userId)
        .in('estado', ['en_espera', 'notificado'])
        .order('fecha_inscripcion', { ascending: false });

      if (error) {
        console.warn('Error al cargar listas de espera del usuario:', error.message);
        return [];
      }

      const results: UserWaitlistItem[] = [];
      const now = Date.now();

      for (const row of (data || [])) {
        const funcion = Array.isArray(row.funciones) ? row.funciones[0] : row.funciones;
        if (!funcion) continue;

        const pelicula = Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas;
        const sala = Array.isArray(funcion.salas) ? funcion.salas[0] : funcion.salas;

        const funcionId = Number(row.funcion_id);
        const position = await this.getUserPositionInWaitlist(funcionId, userId);
        const total = await this.getWaitlistCountForFunction(funcionId);

        let timeRemainingMinutes: number | null = null;
        let timeRemainingSeconds: number | null = null;
        let isNotifiedActive = false;

        if (row.estado === 'notificado' && row.expira_en) {
          const expMs = new Date(row.expira_en).getTime();
          const diffMs = expMs - now;
          if (diffMs > 0) {
            isNotifiedActive = true;
            timeRemainingSeconds = Math.floor(diffMs / 1000);
            timeRemainingMinutes = Math.ceil(diffMs / (60 * 1000));
          }
        }

        const dateObj = funcion.fecha_hora_inicio ? new Date(funcion.fecha_hora_inicio) : new Date();
        const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const mappedSchedule: Schedule = {
          id: String(funcion.id),
          time: timeStr,
          format: funcion.formato || '2D',
          language: funcion.idioma || 'Castellano',
          room: sala?.nombre || 'Sala 1',
          isPresale: Boolean(funcion.en_preventa),
          basePrice: Number(funcion.precio_base || 5500),
          presalePrice: funcion.precio_preventa ? Number(funcion.precio_preventa) : undefined,
          salaId: funcion.sala_id,
          fechaHoraInicio: funcion.fecha_hora_inicio
        };

        const mappedMovie: Movie = {
          id: String(pelicula?.id || 0),
          title: pelicula?.nombre || 'Película',
          synopsis: pelicula?.sinopsis || '',
          duration: Number(pelicula?.duracion_minutos || 120),
          genres: [],
          ageRestriction: pelicula?.restriccion_edad || 'ATP',
          rating: 5,
          reviewsCount: 0,
          ticketsSold: 0,
          imageUrl: pelicula?.imagen_url || '',
          schedules: [mappedSchedule]
        };

        results.push({
          id: row.id,
          funcionId: funcionId,
          perfilId: row.perfil_id,
          estado: row.estado as WaitlistStatus,
          fechaInscripcion: row.fecha_inscripcion,
          notificadoEn: row.notificado_en,
          expiraEn: row.expira_en,
          position: position || 1,
          totalInWaitlist: total,
          timeRemainingMinutes,
          timeRemainingSeconds,
          isNotifiedActive,
          movie: {
            id: pelicula?.id || 0,
            title: pelicula?.nombre || 'Película',
            posterUrl: pelicula?.imagen_url || '',
            ageRestriction: pelicula?.restriccion_edad || 'ATP',
            duration: pelicula?.duracion_minutos || 120
          },
          schedule: {
            id: String(funcion.id),
            time: `${dateStr} ${timeStr}`,
            format: funcion.formato || '2D',
            language: funcion.idioma || 'Castellano',
            room: sala?.nombre || 'Sala 1',
            basePrice: Number(funcion.precio_base || 5500),
            presalePrice: funcion.precio_preventa ? Number(funcion.precio_preventa) : undefined,
            isPresale: Boolean(funcion.en_preventa),
            fechaHoraInicio: funcion.fecha_hora_inicio,
            salaId: funcion.sala_id
          },
          fullMovie: mappedMovie,
          fullSchedule: mappedSchedule
        });
      }

      return results;
    } catch (err) {
      console.warn('Error fetching user waitlists:', err);
      return [];
    }
  }

  /**
   * Calculates the 1-based position of a user for a given function among active entries.
   */
  async getUserPositionInWaitlist(funcionId: number, perfilId: string): Promise<number | null> {
    try {
      // Try RPC first if available
      const { data: rpcPos, error: rpcError } = await this.supabase.client.rpc('obtener_posicion_espera', {
        p_funcion_id: funcionId,
        p_perfil_id: perfilId
      });

      if (!rpcError && typeof rpcPos === 'number') {
        return rpcPos;
      }

      // Fallback query
      const { data, error } = await this.supabase.client
        .from('lista_espera')
        .select('perfil_id, id, fecha_inscripcion')
        .eq('funcion_id', funcionId)
        .in('estado', ['en_espera', 'notificado'])
        .order('fecha_inscripcion', { ascending: true })
        .order('id', { ascending: true });

      if (error || !data) {
        return null;
      }

      const index = data.findIndex(item => item.perfil_id === perfilId);
      return index >= 0 ? index + 1 : null;
    } catch (err) {
      console.warn('Error calculating waitlist position:', err);
      return null;
    }
  }

  /**
   * Returns the count of active people in the waitlist for a specific function.
   */
  async getWaitlistCountForFunction(funcionId: number): Promise<number> {
    try {
      const { data, error } = await this.supabase.client
        .from('lista_espera')
        .select('id', { count: 'exact', head: true })
        .eq('funcion_id', funcionId)
        .in('estado', ['en_espera', 'notificado']);

      if (error) {
        console.warn('Error counting waitlist for function:', error.message);
        return 0;
      }

      return (data as any)?.length || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Returns a map of counts of active people in waitlist for multiple functions (for Admin views).
   */
  async getWaitlistCountsForFunctions(funcionIds: number[]): Promise<Map<number, number>> {
    const countsMap = new Map<number, number>();
    if (!funcionIds || funcionIds.length === 0) {
      return countsMap;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('lista_espera')
        .select('funcion_id')
        .in('funcion_id', funcionIds)
        .in('estado', ['en_espera', 'notificado']);

      if (!error && data) {
        for (const row of data) {
          const fId = Number(row.funcion_id);
          countsMap.set(fId, (countsMap.get(fId) || 0) + 1);
        }
      }
    } catch (err) {
      console.warn('Error fetching waitlist counts for functions:', err);
    }

    return countsMap;
  }

  /**
   * Checks if current user is in waitlist for a function and returns position and status.
   */
  async checkUserWaitlistStatus(funcionId: number, perfilId?: string): Promise<{
    inWaitlist: boolean;
    position?: number;
    estado?: WaitlistStatus;
    expiraEn?: string;
    waitlistId?: number;
  }> {
    const userId = perfilId || this.authService.currentUser()?.id;
    if (!userId) {
      return { inWaitlist: false };
    }

    try {
      const { data, error } = await this.supabase.client
        .from('lista_espera')
        .select('id, estado, expira_en')
        .eq('funcion_id', funcionId)
        .eq('perfil_id', userId)
        .in('estado', ['en_espera', 'notificado'])
        .maybeSingle();

      if (error || !data) {
        return { inWaitlist: false };
      }

      const position = await this.getUserPositionInWaitlist(funcionId, userId);
      return {
        inWaitlist: true,
        position: position || 1,
        estado: data.estado as WaitlistStatus,
        expiraEn: data.expira_en,
        waitlistId: data.id
      };
    } catch {
      return { inWaitlist: false };
    }
  }

  /**
   * Automatically triggered when a ticket/purchase cancellation frees up seats for a function.
   * Advances the waitlist and sends push notification with a 15-minute buying window.
   */
  async processWaitlistAfterSeatFreed(funcionId: number): Promise<{
    success: boolean;
    notifiedUser?: { perfil_id: string; nombre: string };
    message?: string;
  }> {
    try {
      // 1. Try atomic PostgreSQL RPC function if available
      try {
        const { data: rpcData, error: rpcError } = await this.supabase.client.rpc(
          'procesar_siguiente_lista_espera',
          { p_funcion_id: funcionId }
        );

        if (!rpcError && rpcData && rpcData.success) {
          if (rpcData.action === 'nuevo_notificado' && rpcData.perfil_id) {
            // Send push notification to the user
            await this.sendWaitlistFreedNotification(
              rpcData.perfil_id,
              rpcData.pelicula_nombre || 'Película',
              rpcData.fecha_hora_inicio,
              funcionId
            );

            this.auditService.log(
              'lista_espera_notificado',
              'Lista de Espera',
              `Se notificó automáticamente a ${rpcData.nombre || 'Usuario'} ${rpcData.apellido || ''} (${rpcData.email || ''}) por butacas liberadas en la función #${funcionId}. Tiene 15 minutos para comprar.`
            );

            return {
              success: true,
              notifiedUser: { perfil_id: rpcData.perfil_id, nombre: `${rpcData.nombre || ''} ${rpcData.apellido || ''}`.trim() },
              message: `Se notificó al primer usuario de la lista de espera (${rpcData.nombre || 'Usuario'}).`
            };
          } else if (rpcData.action === 'notificado_activo') {
            return {
              success: true,
              message: 'El usuario en turno ya posee una notificación activa de 15 minutos en curso.'
            };
          } else if (rpcData.action === 'sin_espera') {
            return {
              success: true,
              message: 'No hay usuarios en lista de espera para esta función.'
            };
          }
        }
      } catch (rpcErr) {
        console.warn('RPC procesar_siguiente_lista_espera no disponible, ejecutando lógica de respaldo:', rpcErr);
      }

      // 2. Client-side fallback logic
      const now = new Date();
      const nowIso = now.toISOString();

      // Clean up expired notifications
      await this.supabase.client
        .from('lista_espera')
        .update({ estado: 'expirado' })
        .eq('funcion_id', funcionId)
        .eq('estado', 'notificado')
        .lt('expira_en', nowIso);

      // Check if there is already an active notified user whose 15 minutes haven't passed
      const { data: activeNotified } = await this.supabase.client
        .from('lista_espera')
        .select('id, perfil_id, expira_en')
        .eq('funcion_id', funcionId)
        .eq('estado', 'notificado')
        .gte('expira_en', nowIso)
        .maybeSingle();

      if (activeNotified) {
        return {
          success: true,
          message: 'Existe un usuario con notificación activa vigente.'
        };
      }

      // Pick next user in queue
      const { data: nextInLine, error: nextError } = await this.supabase.client
        .from('lista_espera')
        .select(`
          id,
          perfil_id,
          perfiles:perfil_id (
            id,
            nombre,
            apellido,
            email
          ),
          funciones:funcion_id (
            id,
            fecha_hora_inicio,
            peliculas:pelicula_id (
              nombre
            )
          )
        `)
        .eq('funcion_id', funcionId)
        .eq('estado', 'en_espera')
        .order('fecha_inscripcion', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextError || !nextInLine) {
        return {
          success: true,
          message: 'No hay usuarios en espera para esta función.'
        };
      }

      // Set 15 minutes window expiration
      const expiraEn = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      const { error: updateError } = await this.supabase.client
        .from('lista_espera')
        .update({
          estado: 'notificado',
          notificado_en: nowIso,
          expira_en: expiraEn
        })
        .eq('id', nextInLine.id);

      if (updateError) {
        console.error('Error al actualizar estado a notificado:', updateError.message);
      }

      const perfil = Array.isArray(nextInLine.perfiles) ? nextInLine.perfiles[0] : nextInLine.perfiles;
      const funcion = Array.isArray(nextInLine.funciones) ? nextInLine.funciones[0] : nextInLine.funciones;
      const pelicula = funcion?.peliculas ? (Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas) : null;
      const movieTitle = pelicula?.nombre || 'Película';

      // Send push notification
      await this.sendWaitlistFreedNotification(
        nextInLine.perfil_id,
        movieTitle,
        funcion?.fecha_hora_inicio,
        funcionId
      );

      const clienteNombre = perfil ? `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() : 'Usuario';

      this.auditService.log(
        'lista_espera_notificado',
        'Lista de Espera',
        `Se notificó automáticamente a ${clienteNombre} por butacas liberadas en la función #${funcionId}. Tiene 15 minutos para comprar.`
      );

      return {
        success: true,
        notifiedUser: { perfil_id: nextInLine.perfil_id, nombre: clienteNombre },
        message: `Se notificó exitosamente al usuario ${clienteNombre}.`
      };
    } catch (err: any) {
      console.error('Error procesando lista de espera tras liberación de butacas:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Helper to dispatch push notification via PushNotificationService
   */
  private async sendWaitlistFreedNotification(
    perfilId: string,
    movieTitle: string,
    fechaHora?: string,
    funcionId?: number
  ): Promise<void> {
    try {
      let timeText = '';
      if (fechaHora) {
        const d = new Date(fechaHora);
        timeText = ` (${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs)`;
      }

      await this.pushService.sendPushNotification({
        perfil_id: perfilId,
        title: '🎟️ ¡Se liberó una butaca!',
        body: `¡Atención! Se liberaron entradas para "${movieTitle}"${timeText}. Tienes 15 minutos para completar tu compra antes de pasar al siguiente en la lista.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          funcion_id: funcionId,
          type: 'waitlist_freed',
          url: '/perfil'
        },
        url: '/perfil'
      });
    } catch (pushErr) {
      console.warn('Error al enviar push notification de lista de espera:', pushErr);
    }
  }

  /**
   * Marks waitlist item as 'comprado' when the user completes a purchase for that function.
   */
  async markWaitlistAsCompleted(funcionId: number, perfilId: string): Promise<void> {
    try {
      await this.supabase.client
        .from('lista_espera')
        .update({ estado: 'comprado' })
        .eq('funcion_id', funcionId)
        .eq('perfil_id', perfilId);
    } catch (e) {
      console.warn('Error actualizando lista de espera a comprado:', e);
    }
  }

  /**
   * Periodic or on-demand check to expire waitlist windows (>15m) and notify next in line.
   */
  async checkAndAdvanceExpiredWaitlists(specificFuncionId?: number): Promise<void> {
    try {
      const nowIso = new Date().toISOString();

      let query = this.supabase.client
        .from('lista_espera')
        .select('id, funcion_id')
        .eq('estado', 'notificado')
        .lt('expira_en', nowIso);

      if (specificFuncionId) {
        query = query.eq('funcion_id', specificFuncionId);
      }

      const { data: expiredList } = await query;

      if (expiredList && expiredList.length > 0) {
        const affectedFuncionIds = Array.from(new Set(expiredList.map(e => Number(e.funcion_id))));

        for (const fId of affectedFuncionIds) {
          await this.processWaitlistAfterSeatFreed(fId);
        }
      }
    } catch (err) {
      console.warn('Error en checkAndAdvanceExpiredWaitlists:', err);
    }
  }
}
