import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../../../services/movie.service';
import { AdminService } from '../../../../services/admin.service';
import { Movie, Schedule } from '../../../../models/movie';

@Component({
  selector: 'app-admin-movies',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-movies.html',
  styleUrl: './admin-movies.css'
})
export class AdminMovies {
  readonly movieService = inject(MovieService);
  readonly adminService = inject(AdminService);

  // Modal / Form state for Movie ABM
  readonly showMovieForm = signal(false);
  readonly editingMovieId = signal<string | null>(null);

  movieTitle = '';
  movieSynopsis = '';
  movieDuration = 120;
  movieAgeRestriction: 'ATP' | '+13' | '+18' = 'ATP';
  selectedGenres: string[] = ['Acción'];
  moviePlaceholderColor = '#1e3a8a';
  movieRegularPrice = 5500;

  // Showtimes / Schedule assignment state
  readonly showScheduleModal = signal(false);
  selectedMovieForSchedule: Movie | null = null;
  scheduleTime = '16:00';
  scheduleFormat: '2D' | '3D' | '4D' | '5D' = '2D';
  scheduleLanguage: 'Castellano' | 'Subtitulada' = 'Castellano';
  assignedRoom: string | null = null;
  allocationError: string | null = null;
  manualRoomChoice = '';

  readonly colorOptions = [
    { name: 'Azul Noche', value: '#1e3a8a' },
    { name: 'Rojo Carmesí', value: '#7f1d1d' },
    { name: 'Verde Esmeralda', value: '#065f46' },
    { name: 'Púrpura Profundo', value: '#581c87' },
    { name: 'Ámbar Cálido', value: '#b45309' },
    { name: 'Cian Océano', value: '#0e7490' },
    { name: 'Gris Carbón', value: '#374151' }
  ];

  openNewMovieForm(): void {
    this.editingMovieId.set(null);
    this.movieTitle = '';
    this.movieSynopsis = '';
    this.movieDuration = 120;
    this.movieAgeRestriction = 'ATP';
    this.selectedGenres = ['Acción'];
    this.moviePlaceholderColor = '#1e3a8a';
    this.movieRegularPrice = 5500;
    this.showMovieForm.set(true);
  }

  openEditMovieForm(movie: Movie): void {
    this.editingMovieId.set(movie.id);
    this.movieTitle = movie.title;
    this.movieSynopsis = movie.synopsis;
    this.movieDuration = movie.duration;
    this.movieAgeRestriction = movie.ageRestriction;
    this.selectedGenres = [...movie.genres];
    this.moviePlaceholderColor = movie.placeholderColor;
    this.movieRegularPrice = movie.regularPrice || 5500;
    this.showMovieForm.set(true);
  }

  closeMovieForm(): void {
    this.showMovieForm.set(false);
    this.editingMovieId.set(null);
  }

  toggleGenreSelection(genre: string): void {
    if (this.selectedGenres.includes(genre)) {
      if (this.selectedGenres.length > 1) {
        this.selectedGenres = this.selectedGenres.filter(g => g !== genre);
      }
    } else {
      this.selectedGenres = [...this.selectedGenres, genre];
    }
  }

  saveMovie(): void {
    if (!this.movieTitle.trim()) return;

    if (this.editingMovieId()) {
      const existing = this.movieService.movies().find(m => m.id === this.editingMovieId());
      if (existing) {
        const updated: Movie = {
          ...existing,
          title: this.movieTitle.trim(),
          synopsis: this.movieSynopsis.trim(),
          duration: Number(this.movieDuration) || 120,
          ageRestriction: this.movieAgeRestriction,
          genres: this.selectedGenres,
          placeholderColor: this.moviePlaceholderColor,
          regularPrice: Number(this.movieRegularPrice) || 5500
        };
        this.movieService.updateMovie(updated);
        this.adminService.addAuditLog(
          'modificar_pelicula',
          'Películas',
          `Actualizó los datos de la película "${updated.title}".`
        );
      }
    } else {
      const newMovie: Movie = {
        id: `m-${Date.now()}`,
        title: this.movieTitle.trim(),
        synopsis: this.movieSynopsis.trim() || 'Sin sinopsis disponible.',
        duration: Number(this.movieDuration) || 120,
        ageRestriction: this.movieAgeRestriction,
        genres: this.selectedGenres,
        rating: 5.0,
        reviewsCount: 1,
        ticketsSold: 0,
        placeholderColor: this.moviePlaceholderColor,
        regularPrice: Number(this.movieRegularPrice) || 5500,
        isVisibleOnHome: true,
        schedules: []
      };
      this.movieService.addMovie(newMovie);
      this.adminService.addAuditLog(
        'crear_pelicula',
        'Películas',
        `Agregó una nueva película "${newMovie.title}" (${newMovie.duration} min, ${newMovie.ageRestriction}).`
      );
    }

    this.closeMovieForm();
  }

  deleteMovie(movie: Movie): void {
    if (confirm(`¿Estás seguro de eliminar la película "${movie.title}"?`)) {
      this.movieService.deleteMovie(movie.id);
      this.adminService.addAuditLog(
        'eliminar_pelicula',
        'Películas',
        `Eliminó la película "${movie.title}".`
      );
    }
  }

  toggleVisibility(movie: Movie): void {
    this.movieService.toggleMovieVisibility(movie.id);
    const newStatus = movie.isVisibleOnHome === false ? 'visible' : 'oculta';
    this.adminService.addAuditLog(
      'modificar_pelicula',
      'Películas',
      `Cambió visibilidad de "${movie.title}" a ${newStatus} en la página principal.`
    );
  }

  // --- Showtimes & Auto-Room Allocation ---
  openScheduleModal(movie: Movie): void {
    this.selectedMovieForSchedule = movie;
    this.scheduleTime = '17:00';
    this.scheduleFormat = '2D';
    this.scheduleLanguage = 'Castellano';
    this.assignedRoom = null;
    this.allocationError = null;
    this.manualRoomChoice = this.adminService.availableRooms[0];
    this.showScheduleModal.set(true);

    // Run auto allocation initially
    this.runAutoRoomAllocation();
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
    this.selectedMovieForSchedule = null;
  }

  runAutoRoomAllocation(): void {
    if (!this.selectedMovieForSchedule) return;

    this.allocationError = null;
    const result = this.adminService.allocateAutomaticRoom(
      this.scheduleTime,
      this.selectedMovieForSchedule.duration
    );

    if (result.success && result.room) {
      this.assignedRoom = result.room;
    } else {
      this.assignedRoom = null;
      this.allocationError = result.reason || 'No se pudo asignar sala automáticamente sin solapamiento.';
    }
  }

  confirmAddSchedule(): void {
    if (!this.selectedMovieForSchedule) return;

    const roomToUse = this.assignedRoom || this.manualRoomChoice;
    if (!roomToUse) return;

    const newSchedule: Schedule = {
      id: `s-${Date.now()}`,
      time: this.scheduleTime,
      format: this.scheduleFormat,
      language: this.scheduleLanguage,
      room: roomToUse
    };

    this.movieService.addSchedule(this.selectedMovieForSchedule.id, newSchedule);
    this.adminService.addAuditLog(
      'crear_funcion',
      'Funciones',
      `Asignó función para "${this.selectedMovieForSchedule.title}" a las ${newSchedule.time} (${newSchedule.format} - ${newSchedule.language}) en ${newSchedule.room}.`
    );

    this.closeScheduleModal();
  }

  removeSchedule(movie: Movie, schedule: Schedule): void {
    this.movieService.removeSchedule(movie.id, schedule.id);
    this.adminService.addAuditLog(
      'crear_funcion',
      'Funciones',
      `Eliminó la función de las ${schedule.time} en ${schedule.room} para "${movie.title}".`
    );
  }
}
