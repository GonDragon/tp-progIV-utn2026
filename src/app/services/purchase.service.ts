import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { AuditService } from './audit.service';
import { Seat, SeatType, SalaRowLayout } from '../models/seat';
import { Movie, Schedule } from '../models/movie';
import { SelectedCandyItem, CompletedPurchaseResult } from '../models/purchase';

export const SALA_ROWS_CONFIG: SalaRowLayout[] = [
  // Filas A a I: Regulares (Normales)
  { fila: 'A', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'B', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'C', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'D', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'E', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'F', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'G', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'H', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'I', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  // Filas J y K: Accesibles / Discapacidad
  { fila: 'J', tipo: 'Discapacidad', col1Count: 2, col2Count: 10, col3Count: 2, totalSeats: 14 },
  { fila: 'K', tipo: 'Discapacidad', col1Count: 2, col2Count: 10, col3Count: 2, totalSeats: 14 },
  // Filas L a Q: Regulares (Normales)
  { fila: 'L', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'M', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'N', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'O', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'P', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'Q', tipo: 'Normal', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  // Filas R, S, T: VIP
  { fila: 'R', tipo: 'VIP', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'S', tipo: 'VIP', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 },
  { fila: 'T', tipo: 'VIP', col1Count: 4, col2Count: 20, col3Count: 4, totalSeats: 28 }
];

export const VIP_SURCHARGE = 1500;

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly auditService = inject(AuditService);

  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Loads all seats for a given sala, generating and seeding them in Supabase if not yet present.
   */
  async getSeatsForSala(salaId: number): Promise<Seat[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('butacas')
        .select('*')
        .eq('sala_id', salaId)
        .order('id', { ascending: true });

      if (error) {
        console.warn('Error al cargar butacas de sala:', error.message);
      }

      let dbSeats = (data || []) as any[];

      // If sala has no butacas in DB, seed all standard seats
      if (dbSeats.length === 0) {
        dbSeats = await this.seedSalaSeats(salaId);
      }

      const seatsMap = new Map<string, any>();
      for (const s of dbSeats) {
        const key = `${s.fila}-${s.columna}`;
        seatsMap.set(key, s);
      }

      const resultSeats: Seat[] = [];
      for (const rowConfig of SALA_ROWS_CONFIG) {
        for (let col = 1; col <= rowConfig.totalSeats; col++) {
          const key = `${rowConfig.fila}-${col}`;
          const dbSeat = seatsMap.get(key);
          const seatId = dbSeat ? dbSeat.id : (resultSeats.length + 1);

          resultSeats.push({
            id: seatId,
            salaId: salaId,
            fila: rowConfig.fila,
            columna: col,
            tipo: rowConfig.tipo,
            code: `${rowConfig.fila}${col}`,
            isReserved: false
          });
        }
      }

      return resultSeats;
    } catch (err: any) {
      console.error('Error procesando butacas de sala:', err);
      return this.generateDefaultSeatsInMemory(salaId);
    }
  }

  private async seedSalaSeats(salaId: number): Promise<any[]> {
    const toInsert: any[] = [];
    for (const rowConfig of SALA_ROWS_CONFIG) {
      for (let col = 1; col <= rowConfig.totalSeats; col++) {
        toInsert.push({
          sala_id: salaId,
          fila: rowConfig.fila,
          columna: col,
          tipo: rowConfig.tipo
        });
      }
    }

    try {
      const { data, error } = await this.supabase.client
        .from('butacas')
        .insert(toInsert)
        .select();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Error al crear butacas en base de datos:', e);
    }
    return [];
  }

  private generateDefaultSeatsInMemory(salaId: number): Seat[] {
    let mockId = 1;
    const result: Seat[] = [];
    for (const rowConfig of SALA_ROWS_CONFIG) {
      for (let col = 1; col <= rowConfig.totalSeats; col++) {
        result.push({
          id: mockId++,
          salaId: salaId,
          fila: rowConfig.fila,
          columna: col,
          tipo: rowConfig.tipo,
          code: `${rowConfig.fila}${col}`,
          isReserved: false
        });
      }
    }
    return result;
  }

  /**
   * Generates or retrieves a unique session ID UUID for the current client / tab.
   * If user is authenticated, uses user profile UUID.
   */
  getSessionId(): string {
    const currentUser = this.authService.currentUser();
    if (currentUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)) {
      return currentUser.id;
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      let anonSession = sessionStorage.getItem('cinema_temp_session_id');
      if (!anonSession || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(anonSession)) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          anonSession = crypto.randomUUID();
        } else {
          anonSession = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }
        sessionStorage.setItem('cinema_temp_session_id', anonSession);
      }
      return anonSession;
    }

    return '00000000-0000-0000-0000-000000000000';
  }

  /**
   * Fetches the reserved seat IDs for a specific showtime / funcion.
   * Combines ticket purchases and active temporary reservations from other users.
   */
  async getReservedSeatIds(funcionId: number, currentSessionId?: string): Promise<Set<number>> {
    const reservedSet = new Set<number>();
    const sessionId = currentSessionId || this.getSessionId();

    try {
      // 1. Asientos ocupados por tickets comprados
      const { data: tickets, error: ticketError } = await this.supabase.client
        .from('entradas_tickets')
        .select('butaca_id, estado_qr')
        .eq('funcion_id', funcionId);

      if (!ticketError && tickets) {
        for (const item of tickets) {
          if (item.estado_qr !== 'Invalidado' && item.butaca_id != null) {
            reservedSet.add(Number(item.butaca_id));
          }
        }
      }

      // 2. Asientos con reservas temporales activas (no expiradas) de otros usuarios
      const { data: reservas, error: resError } = await this.supabase.client
        .from('reservas_temporales')
        .select('butaca_id, session_id, expira_en')
        .eq('funcion_id', funcionId);

      if (!resError && reservas) {
        const now = Date.now();
        for (const item of reservas) {
          if (item.butaca_id != null) {
            const expiresAt = new Date(item.expira_en).getTime();
            // Solo bloquea si no ha expirado y pertenece a otra sesión/usuario
            if (expiresAt > now && item.session_id !== sessionId) {
              reservedSet.add(Number(item.butaca_id));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error al cargar butacas reservadas:', err);
    }
    return reservedSet;
  }

  /**
   * Reserves a seat temporarily for 5 minutes in `reservas_temporales`.
   */
  async reserveSeat(
    funcionId: number,
    butacaId: number,
    customSessionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const sessionId = customSessionId || this.getSessionId();
    try {
      // 1. Verificar si ya fue comprada
      const { data: ticket } = await this.supabase.client
        .from('entradas_tickets')
        .select('id, estado_qr')
        .eq('funcion_id', funcionId)
        .eq('butaca_id', butacaId)
        .maybeSingle();

      if (ticket && ticket.estado_qr !== 'Invalidado') {
        return { success: false, error: 'La butaca ya fue comprada por otro usuario.' };
      }

      // 2. Verificar si existe reserva temporal
      const { data: existingReservation } = await this.supabase.client
        .from('reservas_temporales')
        .select('*')
        .eq('funcion_id', funcionId)
        .eq('butaca_id', butacaId)
        .maybeSingle();

      const now = Date.now();
      if (existingReservation) {
        const expiresAt = new Date(existingReservation.expira_en).getTime();
        if (expiresAt > now && existingReservation.session_id !== sessionId) {
          return { success: false, error: 'La butaca ya está reservada temporalmente por otro cliente.' };
        }

        // Si expiró o pertenece a la misma sesión, se elimina la anterior para reinsertar
        await this.supabase.client
          .from('reservas_temporales')
          .delete()
          .eq('funcion_id', funcionId)
          .eq('butaca_id', butacaId);
      }

      // 3. Insertar reserva temporal con expiración a 5 minutos
      const expiraEn = new Date(now + 5 * 60 * 1000).toISOString();
      const { error: insertError } = await this.supabase.client
        .from('reservas_temporales')
        .insert({
          funcion_id: funcionId,
          butaca_id: butacaId,
          session_id: sessionId,
          expira_en: expiraEn
        });

      if (insertError) {
        console.warn('Error al crear reserva temporal:', insertError.message);
        return { success: false, error: insertError.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error al reservar butaca temporal:', err);
      return { success: false, error: err.message || 'Error al reservar la butaca.' };
    }
  }

  /**
   * Releases a temporary seat reservation when deselected.
   */
  async releaseSeatReservation(
    funcionId: number,
    butacaId: number,
    customSessionId?: string
  ): Promise<void> {
    const sessionId = customSessionId || this.getSessionId();
    try {
      await this.supabase.client
        .from('reservas_temporales')
        .delete()
        .eq('funcion_id', funcionId)
        .eq('butaca_id', butacaId)
        .eq('session_id', sessionId);
    } catch (err) {
      console.warn('Error al liberar reserva temporal de butaca:', err);
    }
  }

  /**
   * Releases all temporary seat reservations for a session.
   */
  async releaseAllReservationsForSession(
    funcionId?: number,
    customSessionId?: string
  ): Promise<void> {
    const sessionId = customSessionId || this.getSessionId();
    try {
      let query = this.supabase.client
        .from('reservas_temporales')
        .delete()
        .eq('session_id', sessionId);

      if (funcionId) {
        query = query.eq('funcion_id', funcionId);
      }

      await query;
    } catch (err) {
      console.warn('Error al liberar todas las reservas temporales de la sesión:', err);
    }
  }

  /**
   * Subscribes to real-time changes on `reservas_temporales` for a specific funcion.
   */
  subscribeToSeatReservations(funcionId: number, onChange: () => void): RealtimeChannel {
    const channelName = `rt_reservas_funcion_${funcionId}_${Date.now()}`;
    const channel = this.supabase.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas_temporales',
          filter: `funcion_id=eq.${funcionId}`
        },
        () => {
          onChange();
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribes from Supabase Realtime channel.
   */
  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    try {
      await this.supabase.client.removeChannel(channel);
    } catch (err) {
      console.warn('Error al desuscribirse de Supabase Realtime:', err);
    }
  }

  /**
   * Persists a complete ticket purchase into Supabase tables:
   * transacciones -> entradas_tickets -> transacciones_candy -> log_actividad
   */
  async processPurchase(params: {
    movie: Movie;
    schedule: Schedule;
    selectedSeats: Seat[];
    candyItems: SelectedCandyItem[];
    customerName: string;
    customerEmail: string;
  }): Promise<{ success: boolean; result?: CompletedPurchaseResult; error?: string }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const { movie, schedule, selectedSeats, candyItems, customerName, customerEmail } = params;
      const currentUser = this.authService.currentUser();
      const perfilId = currentUser ? currentUser.id : null;
      const funcionId = Number(schedule.id);

      // 1. Calculate price
      const baseTicketPrice = schedule.isPresale && schedule.presalePrice != null
        ? schedule.presalePrice
        : (schedule.basePrice || 5500);

      let ticketsTotal = 0;
      for (const seat of selectedSeats) {
        ticketsTotal += baseTicketPrice;
        if (seat.tipo === 'VIP') {
          ticketsTotal += VIP_SURCHARGE;
        }
      }

      let candyTotal = 0;
      for (const item of candyItems) {
        candyTotal += item.precio * item.cantidad;
      }

      const rawTotal = ticketsTotal + candyTotal;
      let grandTotal = rawTotal;
      let saldoDiscount = 0;

      // Descuento automático por saldo a favor si el cliente está autenticado
      if (currentUser && perfilId) {
        try {
          const { data: perfilData } = await this.supabase.client
            .from('perfiles')
            .select('saldo_favor, puntos_fidelidad')
            .eq('id', perfilId)
            .maybeSingle();

          const currentSaldo = Number(perfilData?.saldo_favor ?? currentUser.saldo_favor ?? 0);
          saldoDiscount = Math.min(rawTotal, currentSaldo);
          grandTotal = Math.max(0, rawTotal - saldoDiscount);

          const newSaldo = currentSaldo - saldoDiscount;
          const currentPoints = Number(perfilData?.puntos_fidelidad ?? currentUser.puntos_fidelidad ?? 0);
          const pointsEarned = Math.floor(grandTotal / 1000);
          const newPoints = currentPoints + pointsEarned;

          await this.supabase.client
            .from('perfiles')
            .update({
              saldo_favor: newSaldo,
              puntos_fidelidad: newPoints
            })
            .eq('id', perfilId);

          this.authService.updateLocalUser({
            saldo_favor: newSaldo,
            puntos_fidelidad: newPoints
          });
        } catch (saldoErr) {
          console.warn('Error al aplicar saldo a favor como descuento:', saldoErr);
        }
      }

      // 2. Insert into transacciones
      const { data: txData, error: txError } = await this.supabase.client
        .from('transacciones')
        .insert({
          perfil_id: perfilId,
          monto_total: grandTotal,
          estado: 'Completada',
          fecha_compra: new Date().toISOString()
        })
        .select()
        .single();

      if (txError || !txData) {
        throw new Error(txError?.message || 'Error al registrar la transacción en la base de datos');
      }

      const transaccionId = txData.id;

      // 3. Insert into entradas_tickets
      const ticketsToInsert = selectedSeats.map((seat, idx) => {
        const uniqueQr = `TKT-${transaccionId}-${funcionId}-${seat.id}-${Date.now().toString(36)}-${idx + 1}`;
        return {
          transaccion_id: transaccionId,
          funcion_id: funcionId,
          butaca_id: seat.id,
          codigo_qr: uniqueQr,
          estado_qr: 'Activo'
        };
      });

      const { data: insertedTickets, error: tktError } = await this.supabase.client
        .from('entradas_tickets')
        .insert(ticketsToInsert)
        .select();

      if (tktError) {
        console.error('Error al insertar entradas_tickets:', tktError.message);
      }

      // 4. Insert into transacciones_candy
      if (candyItems.length > 0) {
        const candyToInsert = candyItems.map(item => ({
          transaccion_id: transaccionId,
          producto_id: item.tipo === 'producto' ? item.id : null,
          combo_id: item.tipo === 'combo' ? item.id : null,
          cantidad: item.cantidad
        }));

        const { error: candyError } = await this.supabase.client
          .from('transacciones_candy')
          .insert(candyToInsert);

        if (candyError) {
          console.error('Error al insertar ítems de candy:', candyError.message);
        }
      }

      // Limpiar reservas temporales correspondientes a las butacas compradas
      try {
        const seatIds = selectedSeats.map(s => s.id);
        await this.supabase.client
          .from('reservas_temporales')
          .delete()
          .eq('funcion_id', funcionId)
          .in('butaca_id', seatIds);
      } catch (cleanErr) {
        console.warn('Error al limpiar reservas temporales tras compra:', cleanErr);
      }

      // 5. Activity log
      const buyerInfo = currentUser
        ? `${currentUser.nombre} ${currentUser.apellido}`
        : `${customerName} (${customerEmail})`;

      const discountInfo = saldoDiscount > 0 ? ` (Descuento saldo a favor: $${saldoDiscount.toLocaleString('es-AR')})` : '';
      const actionText = `Compra #${transaccionId} de ${selectedSeats.length} entradas para "${movie.title}" por $${grandTotal.toLocaleString('es-AR')}${discountInfo} realizada por ${buyerInfo}`;

      try {
        await this.supabase.client
          .from('log_actividad')
          .insert({
            perfil_id: perfilId,
            accion: actionText,
            fecha_hora: new Date().toISOString()
          });
      } catch (logErr) {
        console.warn('Error registrando log de actividad:', logErr);
      }

      // Build Result
      const ticketsResult = selectedSeats.map((seat, idx) => {
        const tkt = insertedTickets ? insertedTickets[idx] : null;
        return {
          ticketId: tkt?.id || (idx + 1),
          seatCode: seat.code,
          seatType: seat.tipo,
          qrCode: tkt?.codigo_qr || `TKT-${transaccionId}-${funcionId}-${seat.id}-${idx + 1}`
        };
      });

      const purchaseResult: CompletedPurchaseResult = {
        transaccionId,
        fechaCompra: new Date().toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        montoTotal: grandTotal,
        movie,
        schedule,
        tickets: ticketsResult,
        candyItems,
        customerName: buyerInfo,
        customerEmail: currentUser?.email || customerEmail
      };

      return {
        success: true,
        result: purchaseResult
      };

    } catch (err: any) {
      console.error('Error al procesar la compra:', err);
      this._error.set(err.message || 'Error inesperado al procesar la compra.');
      return {
        success: false,
        error: err.message || 'Error inesperado al procesar la compra.'
      };
    } finally {
      this._isLoading.set(false);
    }
  }
}
