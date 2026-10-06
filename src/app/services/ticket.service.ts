import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { AuditService } from './audit.service';
import { TicketCandyItem, TicketDetails } from '../models/ticket';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly auditService = inject(AuditService);

  private readonly _isLoading = signal<boolean>(false);
  private readonly _currentTicket = signal<TicketDetails | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly currentTicket = this._currentTicket.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Search and fetch complete ticket details from Supabase by QR code or Code string
   */
  async getTicketByQrCode(rawCode: string): Promise<{
    success: boolean;
    message: string;
    ticket?: TicketDetails;
  }> {
    const cleanCode = rawCode.trim();
    if (!cleanCode) {
      return { success: false, message: 'Código vacío o inválido.' };
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('entradas_tickets')
        .select(`
          id,
          transaccion_id,
          funcion_id,
          butaca_id,
          codigo_qr,
          estado_qr,
          funciones:funcion_id (
            id,
            pelicula_id,
            sala_id,
            fecha_hora_inicio,
            formato,
            idioma,
            precio_base,
            peliculas:pelicula_id (
              id,
              nombre,
              sinopsis,
              duracion_minutos,
              imagen_url,
              restriccion_edad
            ),
            salas:sala_id (
              id,
              nombre
            )
          ),
          butacas:butaca_id (
            id,
            sala_id,
            fila,
            columna,
            tipo
          ),
          transacciones:transaccion_id (
            id,
            perfil_id,
            monto_total,
            fecha_compra,
            estado,
            perfiles:perfil_id (
              id,
              email,
              nombre,
              apellido
            ),
            transacciones_candy (
              id,
              cantidad,
              productos_candy:producto_id (
                id,
                nombre,
                categoria,
                precio
              ),
              combos:combo_id (
                id,
                nombre,
                precio_fijo
              )
            )
          )
        `)
        .ilike('codigo_qr', cleanCode)
        .maybeSingle();

      if (error) {
        console.error('Error al buscar boleto en Supabase:', error.message);
        this._error.set(error.message);
        return {
          success: false,
          message: `Error al consultar la base de datos: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          message: `No se encontró ningún boleto con el código "${cleanCode}".`
        };
      }

      const ticket = this.mapToTicketDetails(data);
      this._currentTicket.set(ticket);

      return {
        success: true,
        message: ticket.isUsed
          ? `Boleto encontrado, pero ya se encuentra utilizado.`
          : `Boleto válido encontrado.`,
        ticket
      };
    } catch (err: any) {
      console.error('Error inesperado buscando ticket:', err);
      const msg = err.message || 'Error de conexión con la base de datos';
      this._error.set(msg);
      return { success: false, message: msg };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Mark ticket as used (Invalidado) in Supabase and write to audit log
   */
  async useTicket(ticketId: number): Promise<{
    success: boolean;
    message: string;
    ticket?: TicketDetails;
  }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('entradas_tickets')
        .update({ estado_qr: 'Invalidado' })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        console.error('Error al marcar boleto como usado:', error.message);
        this._error.set(error.message);
        return {
          success: false,
          message: `Error al actualizar boleto: ${error.message}`
        };
      }

      const current = this._currentTicket();
      let updatedTicket: TicketDetails | undefined;

      if (current && current.id === ticketId) {
        updatedTicket = {
          ...current,
          estadoQr: 'Invalidado',
          isUsed: true
        };
        this._currentTicket.set(updatedTicket);
      }

      // Log activity
      const user = this.authService.currentUser();
      const userName = user ? `${user.nombre} ${user.apellido}` : 'Empleado';
      const movieInfo = current?.pelicula?.nombre ? ` (${current.pelicula.nombre})` : '';
      const seatInfo = current?.butaca?.codigoButaca ? ` - Butaca ${current.butaca.codigoButaca}` : '';

      this.auditService.log(
        'validar_qr',
        'Control de Acceso',
        `Marcó como utilizado el boleto #${current?.codigoQr || ticketId}${movieInfo}${seatInfo}. Validador: ${userName}.`
      );

      return {
        success: true,
        message: '¡El boleto ha sido marcado como utilizado exitosamente!',
        ticket: updatedTicket
      };
    } catch (err: any) {
      console.error('Error actualizando estado del boleto:', err);
      const msg = err.message || 'Error al actualizar boleto';
      this._error.set(msg);
      return { success: false, message: msg };
    } finally {
      this._isLoading.set(false);
    }
  }

  clearCurrentTicket(): void {
    this._currentTicket.set(null);
    this._error.set(null);
  }

  private mapToTicketDetails(raw: any): TicketDetails {
    const estadoQr = raw.estado_qr || 'Activo';
    const isUsed = estadoQr.toLowerCase() !== 'activo';

    const funcion = Array.isArray(raw.funciones) ? raw.funciones[0] : raw.funciones;
    const pelicula = funcion?.peliculas
      ? (Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas)
      : null;
    const sala = funcion?.salas
      ? (Array.isArray(funcion.salas) ? funcion.salas[0] : funcion.salas)
      : null;

    const butaca = Array.isArray(raw.butacas) ? raw.butacas[0] : raw.butacas;
    const transaccion = Array.isArray(raw.transacciones) ? raw.transacciones[0] : raw.transacciones;
    const perfil = transaccion?.perfiles
      ? (Array.isArray(transaccion.perfiles) ? transaccion.perfiles[0] : transaccion.perfiles)
      : null;

    const candyItems: TicketCandyItem[] = [];
    if (transaccion?.transacciones_candy && Array.isArray(transaccion.transacciones_candy)) {
      for (const item of transaccion.transacciones_candy) {
        const prod = Array.isArray(item.productos_candy) ? item.productos_candy[0] : item.productos_candy;
        const combo = Array.isArray(item.combos) ? item.combos[0] : item.combos;

        if (prod) {
          candyItems.push({
            nombre: prod.nombre,
            cantidad: Number(item.cantidad) || 1,
            categoria: prod.categoria,
            tipo: 'producto'
          });
        } else if (combo) {
          candyItems.push({
            nombre: combo.nombre,
            cantidad: Number(item.cantidad) || 1,
            tipo: 'combo'
          });
        }
      }
    }

    const row = butaca?.fila || '';
    const col = butaca?.columna || '';
    const seatCode = row && col ? `${row}-${col}` : (row || col ? `${row}${col}` : 'General');

    return {
      id: raw.id,
      transaccionId: raw.transaccion_id,
      codigoQr: raw.codigo_qr,
      estadoQr,
      isUsed,
      pelicula: {
        id: pelicula?.id,
        nombre: pelicula?.nombre || 'Película Desconocida',
        duracionMinutos: pelicula?.duracion_minutos,
        imagenUrl: pelicula?.imagen_url,
        restriccionEdad: pelicula?.restriccion_edad,
        sinopsis: pelicula?.sinopsis
      },
      funcion: {
        id: funcion?.id,
        fechaHoraInicio: funcion?.fecha_hora_inicio || '',
        formato: funcion?.formato || '2D',
        idioma: funcion?.idioma || 'Castellano',
        precioBase: Number(funcion?.precio_base || 0),
        salaNombre: sala?.nombre || 'Sala Principal'
      },
      butaca: {
        id: butaca?.id,
        fila: row,
        columna: Number(col) || 0,
        tipo: butaca?.tipo || 'Normal',
        codigoButaca: seatCode
      },
      transaccion: {
        id: transaccion?.id,
        montoTotal: Number(transaccion?.monto_total || 0),
        fechaCompra: transaccion?.fecha_compra || '',
        estado: transaccion?.estado || 'Completada'
      },
      cliente: {
        id: perfil?.id,
        nombre: perfil?.nombre || 'Cliente',
        apellido: perfil?.apellido || '',
        nombreCompleto: perfil ? `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() : 'Cliente Anónimo',
        email: perfil?.email || 'No especificado'
      },
      candyItems
    };
  }
}
