import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../models/movie';
import { Review } from '../../models/review';
import { ReviewService } from '../../services/review.service';
import { MovieScheduleCalendar } from '../movie-schedule-calendar/movie-schedule-calendar';

@Component({
  selector: 'app-movie-detail-modal',
  standalone: true,
  imports: [CommonModule, MovieScheduleCalendar],
  templateUrl: './movie-detail-modal.html',
  styleUrl: './movie-detail-modal.css'
})
export class MovieDetailModal {
  private readonly reviewService = inject(ReviewService);

  readonly movie = input<Movie | null>(null);
  readonly close = output<void>();
  readonly scheduleSelected = output<{ movie: Movie; schedule: Schedule }>();

  readonly showReviews = signal<boolean>(false);
  readonly reviews = signal<Review[]>([]);
  readonly isLoadingReviews = signal<boolean>(false);
  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly totalPages = computed(() => {
    const total = this.reviews().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly paginatedReviews = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.reviews().slice(start, start + this.pageSize);
  });

  constructor() {
    // Cada vez que cambia la película o se abre el modal, resetear la vista y cargar reseñas si corresponde
    effect(() => {
      const currentMovie = this.movie();
      if (currentMovie) {
        this.showReviews.set(false);
        this.currentPage.set(1);
        this.reviews.set([]);
      }
    });
  }

  async loadReviews(): Promise<void> {
    const currentMovie = this.movie();
    if (!currentMovie) return;
    this.isLoadingReviews.set(true);
    try {
      const res = await this.reviewService.getReviewsByMovie(currentMovie.id);
      this.reviews.set(res.data);
    } finally {
      this.isLoadingReviews.set(false);
    }
  }

  async openReviews(): Promise<void> {
    this.showReviews.set(true);
    this.currentPage.set(1);
    await this.loadReviews();
  }

  showShowtimes(): void {
    this.showReviews.set(false);
  }

  toggleReviewsView(): void {
    if (this.showReviews()) {
      this.showShowtimes();
    } else {
      this.openReviews();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  onClose(): void {
    this.showReviews.set(false);
    this.close.emit();
  }

  onSelectSchedule(schedule: Schedule): void {
    const currentMovie = this.movie();
    if (currentMovie) {
      this.scheduleSelected.emit({ movie: currentMovie, schedule });
    }
  }
}
