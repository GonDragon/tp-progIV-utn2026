import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../../../services/movie.service';
import { AdminService } from '../../../../services/admin.service';
import { Movie, Schedule } from '../../../../models/movie';
import { MovieListItem } from './components/movie-list-item/movie-list-item';
import { MovieFormModal, MovieFormData } from './components/movie-form-modal/movie-form-modal';
import { ScheduleModal } from './components/schedule-modal/schedule-modal';

@Component({
  selector: 'app-admin-movies',
  standalone: true,
  imports: [
    FormsModule,
    MovieListItem,
    MovieFormModal,
    ScheduleModal
  ],
  templateUrl: './admin-movies.html',
  styleUrl: './admin-movies.css'
})
export class AdminMovies {
  readonly movieService = inject(MovieService);
  readonly adminService = inject(AdminService);

  // Search & Filter state
  readonly filterQuery = signal<string>('');
  readonly filterGenre = signal<string>('Todos');

  // Modal states
  readonly showMovieForm = signal(false);
  readonly editingMovie = signal<Movie | null>(null);
  readonly isSavingMovie = signal(false);

  readonly showScheduleModal = signal(false);
  readonly selectedMovieForSchedule = signal<Movie | null>(null);
  readonly isSavingSchedule = signal(false);

  // Dynamic available genres list from DB or defaults
  readonly availableGenreNames = computed(() => {
    const dbGenres = this.movieService.genres().map(g => g.nombre);
    if (dbGenres.length > 0) return dbGenres;
    return this.movieService.allGenres;
  });

  // Filtered movies for the admin dashboard list
  readonly adminMoviesList = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const g = this.filterGenre();
    const movies = this.movieService.movies();

    return movies.filter(movie => {
      const matchesQ = !q || movie.title.toLowerCase().includes(q) || movie.synopsis.toLowerCase().includes(q);
      const matchesG = g === 'Todos' || movie.genres.includes(g);
      return matchesQ && matchesG;
    });
  });

  // Total scheduled showtimes counter
  readonly totalSchedulesCount = computed(() => {
    return this.movieService.movies().reduce((acc, m) => acc + (m.schedules?.length || 0), 0);
  });

  openNewMovieForm(): void {
    this.editingMovie.set(null);
    this.showMovieForm.set(true);
  }

  openEditMovieForm(movie: Movie): void {
    this.editingMovie.set(movie);
    this.showMovieForm.set(true);
  }

  closeMovieForm(): void {
    this.showMovieForm.set(false);
    this.editingMovie.set(null);
    this.isSavingMovie.set(false);
  }

  async handleSaveMovie(formData: MovieFormData): Promise<void> {
    this.isSavingMovie.set(true);
    try {
      if (formData.id) {
        // Edit existing movie
        const existing = this.movieService.movies().find(m => m.id === formData.id);
        const updated: Movie = {
          ...existing,
          id: formData.id,
          title: formData.title,
          synopsis: formData.synopsis,
          duration: formData.duration,
          ageRestriction: formData.ageRestriction,
          genres: formData.genres,
          imageUrl: formData.imageUrl || undefined,
          regularPrice: formData.regularPrice,
          rating: existing?.rating ?? 5.0,
          reviewsCount: existing?.reviewsCount ?? 1,
          ticketsSold: existing?.ticketsSold ?? 0,
          isVisibleOnHome: existing?.isVisibleOnHome ?? true,
          schedules: existing?.schedules ?? []
        };
        await this.movieService.updateMovie(updated);
        this.adminService.addAuditLog(
          'modificar_pelicula',
          'Películas',
          `Actualizó los datos de la película "${updated.title}".`
        );
      } else {
        // Create new movie
        const newMovie: Movie = {
          id: `m-${Date.now()}`,
          title: formData.title,
          synopsis: formData.synopsis,
          duration: formData.duration,
          ageRestriction: formData.ageRestriction,
          genres: formData.genres,
          imageUrl: formData.imageUrl || undefined,
          regularPrice: formData.regularPrice,
          rating: 5.0,
          reviewsCount: 1,
          ticketsSold: 0,
          isVisibleOnHome: true,
          schedules: []
        };
        await this.movieService.addMovie(newMovie);
        this.adminService.addAuditLog(
          'crear_pelicula',
          'Películas',
          `Agregó una nueva película "${newMovie.title}" (${newMovie.duration} min, ${newMovie.ageRestriction}).`
        );
      }
      this.closeMovieForm();
    } catch (err) {
      console.error('Error al guardar película:', err);
    } finally {
      this.isSavingMovie.set(false);
    }
  }

  async handleDeleteMovie(movie: Movie): Promise<void> {
    if (confirm(`¿Estás seguro de eliminar la película "${movie.title}"?`)) {
      await this.movieService.deleteMovie(movie.id);
      this.adminService.addAuditLog(
        'eliminar_pelicula',
        'Películas',
        `Eliminó la película "${movie.title}".`
      );
    }
  }

  handleToggleVisibility(movie: Movie): void {
    this.movieService.toggleMovieVisibility(movie.id);
    const newStatus = movie.isVisibleOnHome === false ? 'visible' : 'oculta';
    this.adminService.addAuditLog(
      'modificar_pelicula',
      'Películas',
      `Cambió visibilidad de "${movie.title}" a ${newStatus} en la página principal.`
    );
  }

  // --- Schedule management ---
  openScheduleModal(movie: Movie): void {
    this.selectedMovieForSchedule.set(movie);
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
    this.selectedMovieForSchedule.set(null);
    this.isSavingSchedule.set(false);
  }

  async handleSaveSchedules(schedules: Schedule[]): Promise<void> {
    const movie = this.selectedMovieForSchedule();
    if (!movie || !schedules || schedules.length === 0) return;

    this.isSavingSchedule.set(true);
    try {
      await this.movieService.addSchedules(movie.id, schedules);
      const roomsUsed = Array.from(new Set(schedules.map(s => s.room))).join(', ');
      this.adminService.addAuditLog(
        'crear_funcion',
        'Funciones',
        `Programó ${schedules.length} función(es) para "${movie.title}" en [${roomsUsed}].`
      );
      this.closeScheduleModal();
    } catch (err) {
      console.error('Error al programar funciones:', err);
    } finally {
      this.isSavingSchedule.set(false);
    }
  }

  async handleRemoveSchedule(event: { movie: Movie; schedule: Schedule }): Promise<void> {
    await this.movieService.removeSchedule(event.movie.id, event.schedule.id);
    this.adminService.addAuditLog(
      'crear_funcion',
      'Funciones',
      `Eliminó la función de las ${event.schedule.time} en ${event.schedule.room} para "${event.movie.title}".`
    );
  }
}
