import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Movie, Schedule, Genre, Sala } from '../models/movie';
import { SupabaseService } from './supabase';
import { AuditService } from './audit.service';
import { AuthService } from './auth';

export interface PaginatedMoviesResult {
  movies: Movie[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly auditService = inject(AuditService);
  private readonly authService = inject(AuthService);

  private readonly _movies = signal<Movie[]>([]);
  private readonly _upcomingMovies = signal<Movie[]>([]);
  private readonly _selectedGenres = signal<string[]>([]);
  private readonly _searchQuery = signal<string>('');
  private readonly _genres = signal<Genre[]>([]);
  private readonly _salas = signal<Sala[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  get allGenres(): string[] {
    const dbGenres = this._genres();
    if (dbGenres.length > 0) {
      return dbGenres.map(g => g.nombre);
    }
    return [
      'Acción',
      'Animación',
      'Aventura',
      'Ciencia Ficción',
      'Comedia',
      'Crimen',
      'Documental',
      'Drama',
      'Fantasía',
      'Misterio',
      'Musical',
      'Romance',
      'Suspenso',
      'Terror'
    ];
  }
  readonly genres = this._genres.asReadonly();
  readonly salas = this._salas.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly movies = this._movies.asReadonly();
  readonly upcomingMovies = this._upcomingMovies.asReadonly();
  readonly selectedGenres = this._selectedGenres.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();

  // Top 3 best-selling movies
  readonly topSellingMovies = computed(() => {
    return [...this._movies()]
      .sort((a, b) => b.ticketsSold - a.ticketsSold)
      .slice(0, 3);
  });

  // Filtered movies based on search term and multi-genre selection
  readonly filteredMovies = computed(() => {
    const query = this._searchQuery().trim().toLowerCase();
    const genres = this._selectedGenres();

    return this._movies().filter(movie => {
      const matchesQuery = query === '' ||
        movie.title.toLowerCase().includes(query) ||
        movie.synopsis.toLowerCase().includes(query);

      const matchesGenres = genres.length === 0 ||
        genres.some(genre => movie.genres.includes(genre));

      return matchesQuery && matchesGenres;
    });
  });

  constructor() {
    this.loadGenres();
    this.loadSalas();
    effect(() => {
      // Re-load movies when user auth state changes (login, logout, profile update)
      this.authService.currentUser();
      this.loadMovies();
    }, { allowSignalWrites: true });
  }

  private calculateUserAge(birthDateStr?: string | null): number | null {
    if (!birthDateStr) return null;
    let birthDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
      const [y, m, d] = birthDateStr.split('-').map(Number);
      birthDate = new Date(y, m - 1, d);
    } else {
      birthDate = new Date(birthDateStr);
    }
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  private isAdultMovie(restriction?: string | null): boolean {
    if (!restriction) return false;
    const r = restriction.trim().toLowerCase();
    return r === '+18' || r === '18' || r.includes('18') || r.includes('adult');
  }

  private is13Movie(restriction?: string | null): boolean {
    if (!restriction) return false;
    const r = restriction.trim().toLowerCase();
    return r === '+13' || r === '13' || r.includes('13');
  }

  async initData(): Promise<void> {
    await Promise.all([
      this.loadGenres(),
      this.loadSalas(),
      this.loadMovies()
    ]);
  }

  async loadGenres(): Promise<Genre[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('generos')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error al cargar géneros de Supabase:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        this._genres.set(data as Genre[]);
        return data as Genre[];
      }
    } catch (err) {
      console.warn('Error conectando a Supabase para géneros:', err);
    }
    return [];
  }

  async loadSalas(): Promise<Sala[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('salas')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error al cargar salas de Supabase:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        this._salas.set(data as Sala[]);
        return data as Sala[];
      }
    } catch (err) {
      console.warn('Error conectando a Supabase para salas:', err);
    }
    return [];
  }

  async loadMovies(): Promise<void> {
    this._isLoading.set(true);
    try {
      // Fetch ticket counts to know actual tickets sold per movie from Supabase
      const ticketsSoldByMovie = new Map<number, number>();
      try {
        const { data: ticketsData } = await this.supabaseService.client
          .from('entradas_tickets')
          .select('id, funcion_id, funciones ( id, pelicula_id )');

        if (ticketsData) {
          for (const item of ticketsData as any[]) {
            const mId = item.funciones?.pelicula_id;
            if (mId != null) {
              ticketsSoldByMovie.set(mId, (ticketsSoldByMovie.get(mId) || 0) + 1);
            }
          }
        }
      } catch (tErr) {
        console.warn('Error fetching ticket sales stats:', tErr);
      }

      const { data, error } = await this.supabaseService.client
        .from('peliculas')
        .select(`
          id,
          nombre,
          sinopsis,
          duracion_minutos,
          imagen_url,
          restriccion_edad,
          peliculas_generos (
            generos (
              id,
              nombre
            )
          ),
          funciones (
            id,
            pelicula_id,
            sala_id,
            fecha_hora_inicio,
            formato,
            idioma,
            precio_base,
            en_preventa,
            precio_preventa,
            salas (
              id,
              nombre
            )
          ),
          resenas (
            calificacion
          )
        `)
        .order('id', { ascending: false });

      if (error) {
        console.warn('Error al cargar películas de Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        let filteredRows = data;

        // Verificación de censura por edad para cuentas registradas (clientes)
        const currentUser = this.authService.currentUser();
        if (currentUser && currentUser.rol === 'cliente' && currentUser.fecha_nacimiento) {
          const age = this.calculateUserAge(currentUser.fecha_nacimiento);
          if (age !== null) {
            if (age < 13) {
              // Si el usuario tiene -13 años, no se cargan las peliculas +13 (ni adultos +18)
              filteredRows = filteredRows.filter((row: any) => {
                const rest = row.restriccion_edad;
                return !this.isAdultMovie(rest) && !this.is13Movie(rest);
              });
            } else if (age < 18) {
              // Si el usuario tiene -18 años, no se cargan las peliculas para adultos (+18)
              filteredRows = filteredRows.filter((row: any) => {
                const rest = row.restriccion_edad;
                return !this.isAdultMovie(rest);
              });
            }
            // Si el usuario tiene +18 años (age >= 18), se cargan todas las peliculas
          }
        }

        const mappedMovies: Movie[] = filteredRows.map((row: any) => this.mapMovieRow(row, ticketsSoldByMovie));

        this._movies.set(mappedMovies);
      } else {
        this._movies.set([]);
      }
    } catch (err) {
      console.warn('Error procesando películas de Supabase:', err);
    } finally {
      this._isLoading.set(false);
    }
  }

  private mapMovieRow(row: any, ticketsSoldByMovie: Map<number, number>): Movie {
    const genres: string[] = (row.peliculas_generos || [])
      .map((pg: any) => pg.generos?.nombre)
      .filter((name: string | undefined): name is string => !!name);

    const schedules: Schedule[] = (row.funciones || []).map((f: any) => {
      let timeStr = '16:00';
      if (f.fecha_hora_inicio) {
        const d = new Date(f.fecha_hora_inicio);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          timeStr = `${hh}:${mm}`;
        }
      }
      return {
        id: String(f.id),
        time: timeStr,
        format: f.formato || '2D',
        language: f.idioma || 'Castellano',
        room: f.salas?.nombre || `Sala ${f.sala_id}`,
        isPresale: !!f.en_preventa,
        basePrice: Number(f.precio_base) || 5500,
        presalePrice: f.precio_preventa != null ? Number(f.precio_preventa) : undefined,
        salaId: f.sala_id,
        fechaHoraInicio: f.fecha_hora_inicio
      };
    });

    const ratings: number[] = (row.resenas || [])
      .map((r: any) => Number(r.calificacion))
      .filter((c: number) => !isNaN(c));
    const ratingAvg = ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 5.0;

    const soldCount = ticketsSoldByMovie.get(row.id) || 0;

    return {
      id: String(row.id),
      title: row.nombre,
      synopsis: row.sinopsis || 'Sin sinopsis disponible.',
      duration: Number(row.duracion_minutos) || 120,
      imageUrl: row.imagen_url || undefined,
      ageRestriction: (row.restriccion_edad as any) || 'ATP',
      genres: genres.length > 0 ? genres : ['Acción'],
      rating: ratingAvg,
      reviewsCount: ratings.length > 0 ? ratings.length : 0,
      ticketsSold: soldCount,
      isVisibleOnHome: true,
      schedules
    };
  }

  async getPaginatedMovies(options: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    genres?: string[];
  } = {}): Promise<PaginatedMoviesResult> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, options.pageSize || 5);
    const searchQuery = (options.searchQuery || '').trim();
    const genres = options.genres || [];

    try {
      // 1. Si hay géneros seleccionados, filtrar IDs de películas correspondientes
      let matchingMovieIds: number[] | null = null;
      if (genres.length > 0) {
        const { data: pgData, error: pgError } = await this.supabaseService.client
          .from('peliculas_generos')
          .select('pelicula_id, generos!inner(nombre)')
          .in('generos.nombre', genres);

        if (pgError) {
          console.warn('Error al consultar géneros para paginación:', pgError);
        }

        if (pgData && pgData.length > 0) {
          matchingMovieIds = [...new Set(pgData.map((pg: any) => pg.pelicula_id))];
        } else {
          return {
            movies: [],
            totalCount: 0,
            page,
            pageSize,
            totalPages: 0
          };
        }
      }

      // 2. Consulta con Lazy Loading a Supabase con paginación
      let query = this.supabaseService.client
        .from('peliculas')
        .select(`
          id,
          nombre,
          sinopsis,
          duracion_minutos,
          imagen_url,
          restriccion_edad,
          peliculas_generos (
            generos (
              id,
              nombre
            )
          ),
          funciones (
            id,
            pelicula_id,
            sala_id,
            fecha_hora_inicio,
            formato,
            idioma,
            precio_base,
            en_preventa,
            precio_preventa,
            salas (
              id,
              nombre
            )
          ),
          resenas (
            calificacion
          )
        `, { count: 'exact' });

      if (matchingMovieIds !== null) {
        query = query.in('id', matchingMovieIds);
      }

      if (searchQuery) {
        query = query.or(`nombre.ilike.%${searchQuery}%,sinopsis.ilike.%${searchQuery}%`);
      }

      // Filtro de edad para cliente
      const currentUser = this.authService.currentUser();
      if (currentUser && currentUser.rol === 'cliente' && currentUser.fecha_nacimiento) {
        const age = this.calculateUserAge(currentUser.fecha_nacimiento);
        if (age !== null) {
          if (age < 13) {
            query = query.not('restriccion_edad', 'ilike', '%13%').not('restriccion_edad', 'ilike', '%18%');
          } else if (age < 18) {
            query = query.not('restriccion_edad', 'ilike', '%18%');
          }
        }
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('id', { ascending: false })
        .range(from, to);

      if (error) {
        console.warn('Error al obtener películas paginadas:', error);
        return {
          movies: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0
        };
      }

      const totalCount = count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      if (!data || data.length === 0) {
        return {
          movies: [],
          totalCount,
          page,
          pageSize,
          totalPages
        };
      }

      // Obtener estadísticas de tickets únicamente para las películas de esta página
      const movieIds = data.map((r: any) => r.id);
      const ticketsSoldByMovie = new Map<number, number>();
      try {
        const { data: ticketsData } = await this.supabaseService.client
          .from('entradas_tickets')
          .select('id, funcion_id, funciones!inner(pelicula_id)')
          .in('funciones.pelicula_id', movieIds);

        if (ticketsData) {
          for (const item of ticketsData as any[]) {
            const mId = item.funciones?.pelicula_id;
            if (mId != null) {
              ticketsSoldByMovie.set(mId, (ticketsSoldByMovie.get(mId) || 0) + 1);
            }
          }
        }
      } catch (tErr) {
        console.warn('Error al obtener conteo de tickets para películas paginadas:', tErr);
      }

      const movies = data.map((row: any) => this.mapMovieRow(row, ticketsSoldByMovie));

      return {
        movies,
        totalCount,
        page,
        pageSize,
        totalPages
      };
    } catch (err) {
      console.warn('Error in getPaginatedMovies:', err);
      return {
        movies: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }

  async uploadPoster(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `posters/${fileName}`;

    const { error: uploadError } = await this.supabaseService.client
      .storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error al subir imagen al bucket 'images': ${uploadError.message}`);
    }

    const { data: urlData } = this.supabaseService.client
      .storage
      .from('images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  async addMovie(movie: Movie): Promise<void> {
    // 1. In-memory update
    this._movies.update(current => [movie, ...current]);

    // 2. Supabase insert
    try {
      const { data: inserted, error: movieError } = await this.supabaseService.client
        .from('peliculas')
        .insert({
          nombre: movie.title,
          sinopsis: movie.synopsis,
          duracion_minutos: movie.duration,
          imagen_url: movie.imageUrl || null,
          restriccion_edad: movie.ageRestriction
        })
        .select()
        .single();

      if (movieError) {
        console.error('Error insertando película en Supabase:', movieError);
        return;
      }

      if (inserted) {
        const newDbId = String(inserted.id);
        // Link genres if any
        if (movie.genres && movie.genres.length > 0) {
          await this.syncMovieGenres(inserted.id, movie.genres);
        }

        // Update in-memory ID to match Supabase ID
        this._movies.update(current =>
          current.map(m => m.id === movie.id ? { ...m, id: newDbId } : m)
        );
      }
    } catch (e) {
      console.error('Error al persistir película en Supabase:', e);
    }
  }

  async updateMovie(updatedMovie: Movie): Promise<void> {
    this._movies.update(current =>
      current.map(m => m.id === updatedMovie.id ? { ...m, ...updatedMovie } : m)
    );

    const numericId = Number(updatedMovie.id);
    if (!isNaN(numericId)) {
      try {
        const { error } = await this.supabaseService.client
          .from('peliculas')
          .update({
            nombre: updatedMovie.title,
            sinopsis: updatedMovie.synopsis,
            duracion_minutos: updatedMovie.duration,
            imagen_url: updatedMovie.imageUrl || null,
            restriccion_edad: updatedMovie.ageRestriction
          })
          .eq('id', numericId);

        if (error) console.error('Error actualizando película en Supabase:', error);

        if (updatedMovie.genres) {
          await this.syncMovieGenres(numericId, updatedMovie.genres);
        }
      } catch (e) {
        console.error('Error en updateMovie en Supabase:', e);
      }
    }
  }

  async deleteMovie(movieId: string): Promise<void> {
    this._movies.update(current => current.filter(m => m.id !== movieId));

    const numericId = Number(movieId);
    if (!isNaN(numericId)) {
      try {
        const { error } = await this.supabaseService.client
          .from('peliculas')
          .delete()
          .eq('id', numericId);

        if (error) console.error('Error eliminando película en Supabase:', error);
      } catch (e) {
        console.error('Error en deleteMovie en Supabase:', e);
      }
    }
  }

  private async syncMovieGenres(peliculaId: number, genreNames: string[]): Promise<void> {
    try {
      // 1. Get genre IDs or insert missing
      let allDbGenres = this._genres();
      if (allDbGenres.length === 0) {
        allDbGenres = await this.loadGenres();
      }

      const genreIds: number[] = [];
      for (const name of genreNames) {
        let match = allDbGenres.find(g => g.nombre.toLowerCase() === name.toLowerCase());
        if (!match) {
          // Attempt insert into generos
          const { data: newG } = await this.supabaseService.client
            .from('generos')
            .insert({ nombre: name })
            .select()
            .single();
          if (newG) {
            match = newG as Genre;
            this._genres.update(curr => [...curr, match!]);
          }
        }
        if (match) {
          genreIds.push(match.id);
        }
      }

      // 2. Clear old joins
      await this.supabaseService.client
        .from('peliculas_generos')
        .delete()
        .eq('pelicula_id', peliculaId);

      // 3. Insert new joins
      if (genreIds.length > 0) {
        const joins = genreIds.map(gId => ({
          pelicula_id: peliculaId,
          genero_id: gId
        }));
        await this.supabaseService.client
          .from('peliculas_generos')
          .insert(joins);
      }
    } catch (e) {
      console.warn('Error al sincronizar géneros de película:', e);
    }
  }

  async addSchedules(movieId: string, schedules: Schedule[]): Promise<void> {
    if (!schedules || schedules.length === 0) return;

    // Update local state first with temp schedules
    this._movies.update(current =>
      current.map(m => {
        if (m.id === movieId) {
          const existing = m.schedules || [];
          return { ...m, schedules: [...existing, ...schedules] };
        }
        return m;
      })
    );

    const numericMovieId = Number(movieId);
    if (!isNaN(numericMovieId)) {
      try {
        let salas = this._salas().length > 0 ? this._salas() : await this.loadSalas();

        // Ensure all salas exist and get their IDs
        const rowsToInsert: any[] = [];
        for (const s of schedules) {
          let salaId = s.salaId;
          if (!salaId) {
            const found = salas.find(r => r.nombre.toLowerCase() === s.room.toLowerCase());
            if (found) {
              salaId = found.id;
            } else {
              // Insert missing sala
              const { data: newSala } = await this.supabaseService.client
                .from('salas')
                .insert({ nombre: s.room })
                .select()
                .single();
              if (newSala) {
                salaId = newSala.id;
                this._salas.update(curr => [...curr, newSala as Sala]);
                salas = [...salas, newSala as Sala];
              } else {
                salaId = 1;
              }
            }
          }

          const todayStr = new Date().toISOString().split('T')[0];
          const dateTimeStr = s.fechaHoraInicio || `${todayStr}T${s.time}:00`;

          rowsToInsert.push({
            pelicula_id: numericMovieId,
            sala_id: salaId,
            fecha_hora_inicio: dateTimeStr,
            formato: s.format,
            idioma: s.language,
            precio_base: s.basePrice || 5500,
            en_preventa: !!s.isPresale,
            precio_preventa: s.isPresale && s.presalePrice != null ? s.presalePrice : null
          });
        }

        const { data: insertedData, error } = await this.supabaseService.client
          .from('funciones')
          .insert(rowsToInsert)
          .select('id, pelicula_id, sala_id, fecha_hora_inicio, formato, idioma, precio_base, en_preventa, precio_preventa, salas ( id, nombre )');

        if (error) {
          console.error('Error insertando funciones en Supabase:', error);
        } else if (insertedData && insertedData.length > 0) {
          // Sync IDs from DB
          const insertedMap = new Map<string, string>();
          insertedData.forEach((row: any, idx: number) => {
            if (schedules[idx]) {
              insertedMap.set(schedules[idx].id, String(row.id));
            }
          });

          this._movies.update(current =>
            current.map(m => {
              if (m.id === movieId && m.schedules) {
                return {
                  ...m,
                  schedules: m.schedules.map(s => {
                    const dbId = insertedMap.get(s.id);
                    return dbId ? { ...s, id: dbId } : s;
                  })
                };
              }
              return m;
            })
          );
        }
      } catch (e) {
        console.error('Error al guardar funciones en Supabase:', e);
      }
    }
  }

  async addSchedule(movieId: string, schedule: Schedule): Promise<void> {
    await this.addSchedules(movieId, [schedule]);
  }

  async removeSchedule(movieId: string, scheduleId: string): Promise<void> {
    this._movies.update(current =>
      current.map(m => {
        if (m.id === movieId && m.schedules) {
          return { ...m, schedules: m.schedules.filter(s => s.id !== scheduleId) };
        }
        return m;
      })
    );

    const numericScheduleId = Number(scheduleId);
    if (!isNaN(numericScheduleId)) {
      try {
        const { error } = await this.supabaseService.client
          .from('funciones')
          .delete()
          .eq('id', numericScheduleId);
        if (error) console.error('Error eliminando función en Supabase:', error);
      } catch (e) {
        console.error('Error al eliminar función en Supabase:', e);
      }
    }
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  toggleGenre(genre: string): void {
    this._selectedGenres.update(current => {
      if (current.includes(genre)) {
        return current.filter(g => g !== genre);
      } else {
        return [...current, genre];
      }
    });
  }

  clearGenreFilters(): void {
    this._selectedGenres.set([]);
  }

  toggleUpcomingAlert(movieId: string): void {
    this._upcomingMovies.update(list =>
      list.map(movie =>
        movie.id === movieId
          ? { ...movie, notificationSubscribed: !movie.notificationSubscribed }
          : movie
      )
    );
  }

  toggleMovieVisibility(movieId: string): void {
    this._movies.update(current =>
      current.map(m =>
        m.id === movieId
          ? { ...m, isVisibleOnHome: m.isVisibleOnHome === false ? true : false }
          : m
      )
    );
  }

  updatePresale(
    movieId: string,
    config: {
      isPresaleEnabled: boolean;
      presalePrice?: number;
      presaleStartDate?: string;
      presaleEndDate?: string;
    }
  ): void {
    const movie = this._movies().find(m => m.id === movieId);
    const price = config.presalePrice ?? movie?.presalePrice ?? 4500;

    this._movies.update(current =>
      current.map(m => {
        if (m.id === movieId) {
          return {
            ...m,
            isPresaleEnabled: config.isPresaleEnabled,
            presalePrice: price,
            presaleStartDate: config.presaleStartDate ?? m.presaleStartDate,
            presaleEndDate: config.presaleEndDate ?? m.presaleEndDate
          };
        }
        return m;
      })
    );

    const status = config.isPresaleEnabled ? `activada con precio especial $${price}` : 'desactivada';
    this.auditService.log(
      'actualizar_preventa',
      'Preventas',
      `Preventa para "${movie?.title || movieId}" ${status}.`
    );
  }
}
