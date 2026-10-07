import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { PdfService } from './pdf.service';
import { TicketService } from './ticket.service';
import { ReviewService } from './review.service';
import { UserProfileData, ActiveTicketItem, WatchedMovieItem } from '../models/profile';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly pdfService = inject(PdfService);
  private readonly ticketService = inject(TicketService);
  private readonly reviewService = inject(ReviewService);

  private readonly _profile = signal<UserProfileData | null>(null);
  private readonly _activeTickets = signal<ActiveTicketItem[]>([]);
  private readonly _watchedMovies = signal<WatchedMovieItem[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isDownloadingPdf = signal<number | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly profile = this._profile.asReadonly();
  readonly activeTickets = this._activeTickets.asReadonly();
  readonly watchedMovies = this._watchedMovies.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isDownloadingPdf = this._isDownloadingPdf.asReadonly();
  readonly error = this._error.asReadonly();

  async loadProfileData(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user || !user.id) {
      this._profile.set(null);
      this._activeTickets.set([]);
      this._watchedMovies.set([]);
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      // 1. Fetch fresh user profile details
      await this.fetchUserProfile(user.id);

      // 2. Fetch active tickets & generate QR data URLs
      await this.fetchActiveTickets(user.id);

      // 3. Fetch watched movies history
      await this.fetchWatchedMovies(user.id);
    } catch (err: any) {
      console.error('Error al cargar datos del perfil:', err);
      this._error.set(err.message || 'Error al cargar los datos del perfil');
    } finally {
      this._isLoading.set(false);
    }
  }

  private async fetchUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching perfiles:', error.message);
      }

      const currentUser = this.authService.currentUser();
      if (data) {
        this._profile.set({
          id: data.id,
          email: data.email || currentUser?.email || '',
          nombre: data.nombre || currentUser?.nombre || '',
          apellido: data.apellido || currentUser?.apellido || '',
          rol: (data.rol as 'cliente' | 'empleado' | 'administrador') || 'cliente',
          fecha_nacimiento: data.fecha_nacimiento ?? null,
          tipo_sangre: data.tipo_sangre ?? null,
          color_ojos: data.color_ojos ?? null,
          dias_vacaciones: data.dias_vacaciones !== undefined ? Number(data.dias_vacaciones) : null,
          puntos_fidelidad: Number(data.puntos_fidelidad || 0),
          saldo_favor: Number(data.saldo_favor || 0),
          created_at: data.created_at
        });
      } else if (currentUser) {
        this._profile.set({
          id: currentUser.id,
          email: currentUser.email,
          nombre: currentUser.nombre,
          apellido: currentUser.apellido,
          rol: currentUser.rol,
          fecha_nacimiento: currentUser.fecha_nacimiento ?? null,
          tipo_sangre: currentUser.tipo_sangre ?? null,
          color_ojos: currentUser.color_ojos ?? null,
          dias_vacaciones: currentUser.dias_vacaciones !== undefined ? Number(currentUser.dias_vacaciones) : null,
          puntos_fidelidad: Number(currentUser.puntos_fidelidad || 0),
          saldo_favor: Number(currentUser.saldo_favor || 0),
          created_at: currentUser.created_at
        });
      }
    } catch (e) {
      console.warn('Error al obtener perfil:', e);
    }
  }

  private async fetchActiveTickets(userId: string): Promise<void> {
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
          transacciones:transaccion_id!inner (
            id,
            perfil_id,
            monto_total,
            fecha_compra,
            estado,
            transacciones_candy (
              id,
              cantidad,
              productos_candy:producto_id (
                id,
                nombre,
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
        .eq('transacciones.perfil_id', userId)
        .eq('estado_qr', 'Activo')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching active tickets:', error.message);
        this._activeTickets.set([]);
        return;
      }

      const QRCode = await import('qrcode');
      const tickets: ActiveTicketItem[] = [];

      for (const row of (data || [])) {
        const transaccion = Array.isArray(row.transacciones) ? row.transacciones[0] : row.transacciones;
        if (transaccion?.estado === 'Cancelada') {
          continue;
        }

        const funcion = Array.isArray(row.funciones) ? row.funciones[0] : row.funciones;
        const pelicula = funcion?.peliculas
          ? (Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas)
          : null;
        const sala = funcion?.salas
          ? (Array.isArray(funcion.salas) ? funcion.salas[0] : funcion.salas)
          : null;
        const butaca = Array.isArray(row.butacas) ? row.butacas[0] : row.butacas;

        const candyItems: Array<{ nombre: string; cantidad: number; precio?: number }> = [];
        if (transaccion?.transacciones_candy && Array.isArray(transaccion.transacciones_candy)) {
          for (const item of transaccion.transacciones_candy) {
            const prod = Array.isArray(item.productos_candy) ? item.productos_candy[0] : item.productos_candy;
            const combo = Array.isArray(item.combos) ? item.combos[0] : item.combos;
            if (prod) {
              candyItems.push({
                nombre: prod.nombre,
                cantidad: Number(item.cantidad) || 1,
                precio: Number(prod.precio || 0)
              });
            } else if (combo) {
              candyItems.push({
                nombre: combo.nombre,
                cantidad: Number(item.cantidad) || 1,
                precio: Number(combo.precio_fijo || 0)
              });
            }
          }
        }

        const rowLetter = butaca?.fila || '';
        const colNumber = butaca?.columna ? Number(butaca.columna) : 0;
        const seatCode = rowLetter && colNumber ? `${rowLetter}-${colNumber}` : (rowLetter || 'General');

        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(row.codigo_qr, {
            margin: 1,
            width: 220,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
        } catch (e) {
          console.warn('Error generating QR data URL:', e);
        }

        let formattedTime = '';
        if (funcion?.fecha_hora_inicio) {
          try {
            const d = new Date(funcion.fecha_hora_inicio);
            formattedTime = d.toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch {
            formattedTime = funcion.fecha_hora_inicio;
          }
        }

        const user = this._profile() || this.authService.currentUser();
        const customerName = user ? `${user.nombre} ${user.apellido}`.trim() : 'Cliente';
        const customerEmail = user?.email || '';

        tickets.push({
          id: row.id,
          transaccionId: row.transaccion_id,
          codigoQr: row.codigo_qr,
          estadoQr: row.estado_qr || 'Activo',
          qrDataUrl,
          movie: {
            id: pelicula?.id || 0,
            title: pelicula?.nombre || 'Película',
            synopsis: pelicula?.sinopsis,
            duration: pelicula?.duracion_minutos,
            posterUrl: pelicula?.imagen_url,
            ageRestriction: pelicula?.restriccion_edad || 'ATP'
          },
          schedule: {
            id: funcion?.id || 0,
            time: formattedTime,
            dateTimeRaw: funcion?.fecha_hora_inicio,
            room: sala?.nombre || 'Sala Principal',
            format: funcion?.formato || '2D',
            language: funcion?.idioma || 'Castellano',
            basePrice: Number(funcion?.precio_base || 0)
          },
          seat: {
            id: butaca?.id || 0,
            seatCode,
            seatType: butaca?.tipo || 'Normal',
            fila: rowLetter,
            columna: colNumber
          },
          transaccion: {
            id: transaccion?.id || row.transaccion_id,
            montoTotal: Number(transaccion?.monto_total || 0),
            fechaCompra: transaccion?.fecha_compra ? new Date(transaccion.fecha_compra).toLocaleDateString('es-AR') : '',
            estado: transaccion?.estado || 'Completada'
          },
          customerName,
          customerEmail,
          candyItems
        });
      }

      this._activeTickets.set(tickets);
    } catch (err: any) {
      console.error('Error fetching active tickets:', err);
      this._activeTickets.set([]);
    }
  }

  private async fetchWatchedMovies(userId: string): Promise<void> {
    try {
      const reviewedMovieIds = await this.reviewService.getUserReviewedMovieIds(userId);

      const { data, error } = await this.supabase.client
        .from('entradas_tickets')
        .select(`
          id,
          estado_qr,
          funciones:funcion_id (
            id,
            fecha_hora_inicio,
            peliculas:pelicula_id (
              id,
              nombre,
              imagen_url
            )
          ),
          transacciones:transaccion_id!inner (
            id,
            perfil_id,
            estado
          )
        `)
        .eq('transacciones.perfil_id', userId);

      if (error) {
        console.warn('Error fetching watched movies:', error.message);
        this._watchedMovies.set([]);
        return;
      }

      const movieMap = new Map<number, WatchedMovieItem>();
      const now = new Date();

      for (const row of (data || [])) {
        const transaccion = Array.isArray(row.transacciones) ? row.transacciones[0] : row.transacciones;
        if (transaccion?.estado === 'Cancelada') {
          continue;
        }

        const funcion = Array.isArray(row.funciones) ? row.funciones[0] : row.funciones;
        const pelicula = funcion?.peliculas
          ? (Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas)
          : null;

        if (!pelicula || !pelicula.id) {
          continue;
        }

        const isUsed = (row.estado_qr || '').toLowerCase() === 'invalidado';
        const isPastShowtime = funcion?.fecha_hora_inicio ? new Date(funcion.fecha_hora_inicio) < now : false;

        // Se considera vista si el QR fue invalidado (usado en el cine) o ya pasó el horario de la función
        if (isUsed || isPastShowtime) {
          if (!movieMap.has(pelicula.id)) {
            movieMap.set(pelicula.id, {
              id: pelicula.id,
              title: pelicula.nombre,
              posterUrl: pelicula.imagen_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60',
              hasReview: reviewedMovieIds.has(pelicula.id)
            });
          }
        }
      }

      this._watchedMovies.set(Array.from(movieMap.values()));
    } catch (err: any) {
      console.warn('Error processing watched movies:', err);
      this._watchedMovies.set([]);
    }
  }

  async downloadTicketPdf(ticket: ActiveTicketItem): Promise<void> {
    this._isDownloadingPdf.set(ticket.id);
    try {
      await this.pdfService.generateSingleTicketPdf(ticket);
    } catch (e) {
      console.error('Error al generar PDF de entrada:', e);
    } finally {
      this._isDownloadingPdf.set(null);
    }
  }

  async autoRefundTicket(ticketId: number): Promise<{ success: boolean; message: string; refundAmount?: number }> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const res = await this.ticketService.refundTicket(ticketId);
      if (res.success) {
        await this.loadProfileData();
      } else {
        this._error.set(res.message);
      }
      return res;
    } catch (err: any) {
      const msg = err.message || 'Error al procesar la devolución automática';
      this._error.set(msg);
      return { success: false, message: msg };
    } finally {
      this._isLoading.set(false);
    }
  }
}
