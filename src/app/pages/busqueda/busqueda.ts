import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MovieService } from '../../services/movie.service';
import { MovieFilter } from '../../components/movie-filter/movie-filter';
import { MovieCard } from '../../components/movie-card/movie-card';
import { MovieDetailModal } from '../../components/movie-detail-modal/movie-detail-modal';
import { PurchaseFlow } from '../../components/purchase-flow/purchase-flow';
import { Movie, Schedule } from '../../models/movie';
import { CompletedPurchaseResult } from '../../models/purchase';

@Component({
  selector: 'app-busqueda',
  standalone: true,
  imports: [
    MovieFilter,
    MovieCard,
    MovieDetailModal,
    PurchaseFlow
  ],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.css'
})
export class Busqueda implements OnInit {
  readonly authService = inject(AuthService);
  readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly searchQuery = signal<string>('');
  readonly selectedGenres = signal<string[]>([]);
  readonly currentPage = signal<number>(1);
  readonly pageSize = 5;

  readonly movies = signal<Movie[]>([]);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly isLoading = signal<boolean>(false);

  readonly selectedMovie = signal<Movie | null>(null);
  readonly purchaseMovie = signal<Movie | null>(null);
  readonly purchaseSchedule = signal<Schedule | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && (user.rol === 'administrador' || user.rol === 'empleado')) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnInit(): void {
    this.loadMovies(1);
  }

  async loadMovies(page: number = this.currentPage()): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.movieService.getPaginatedMovies({
        page,
        pageSize: this.pageSize,
        searchQuery: this.searchQuery(),
        genres: this.selectedGenres()
      });

      this.movies.set(result.movies);
      this.totalCount.set(result.totalCount);
      this.totalPages.set(result.totalPages);
      this.currentPage.set(result.page);
    } catch (err) {
      console.error('Error al cargar películas en búsqueda:', err);
      this.movies.set([]);
      this.totalCount.set(0);
      this.totalPages.set(0);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.loadMovies(1);
  }

  onGenreToggled(genre: string): void {
    this.selectedGenres.update(current => {
      if (current.includes(genre)) {
        return current.filter(g => g !== genre);
      } else {
        return [...current, genre];
      }
    });
    this.loadMovies(1);
  }

  onClearFilters(): void {
    this.searchQuery.set('');
    this.selectedGenres.set([]);
    this.loadMovies(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.loadMovies(page);
    }
  }

  onMovieSelected(movie: Movie): void {
    this.selectedMovie.set(movie);
  }

  onCloseMovieModal(): void {
    this.selectedMovie.set(null);
  }

  onScheduleSelected(event: { movie: Movie; schedule: Schedule }): void {
    this.selectedMovie.set(null);
    this.purchaseMovie.set(event.movie);
    this.purchaseSchedule.set(event.schedule);
  }

  onClosePurchaseFlow(): void {
    this.purchaseMovie.set(null);
    this.purchaseSchedule.set(null);
  }

  onPurchaseCompleted(result: CompletedPurchaseResult): void {
    this.loadMovies(this.currentPage());
    this.movieService.loadMovies();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 1) return [1];

    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
