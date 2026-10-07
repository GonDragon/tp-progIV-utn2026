import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie, Schedule } from '../../models/movie';
import { Review } from '../../models/review';
import { ReviewService } from '../../services/review.service';
import { MovieScheduleCalendar } from '../movie-schedule-calendar/movie-schedule-calendar';

export interface DayScheduleGroup {
  dayLabel: string;
  dateKey: string;
  schedules: Schedule[];
}

@Component({
  selector: 'app-movie-detail-modal',
  standalone: true,
  imports: [CommonModule, MovieScheduleCalendar],
  templateUrl: './movie-detail-modal.html',
  styleUrl: './movie-detail-modal.css'
})
export class MovieDetailModal implements OnChanges {
  private readonly reviewService = inject(ReviewService);

  @Input() movie: Movie | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() scheduleSelected = new EventEmitter<{ movie: Movie; schedule: Schedule }>();

  readonly showReviews = signal<boolean>(false);
  readonly reviews = signal<Review[]>([]);
  readonly isLoadingReviews = signal<boolean>(false);
  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly totalPages = computed(() => {
    const count = this.reviews().length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  });

  readonly paginatedReviews = computed(() => {
    const list = this.reviews();
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movie'] && this.movie) {
      this.showReviews.set(false);
      this.currentPage.set(1);
      this.loadReviews();
    }
  }

  async loadReviews(): Promise<void> {
    if (!this.movie) {
      this.reviews.set([]);
      return;
    }
    this.isLoadingReviews.set(true);
    try {
      const res = await this.reviewService.getReviewsByMovie(this.movie.id);
      this.reviews.set(res.data || []);
    } catch {
      this.reviews.set([]);
    } finally {
      this.isLoadingReviews.set(false);
    }
  }

  showShowtimes(): void {
    this.showReviews.set(false);
  }

  openReviews(): void {
    this.showReviews.set(true);
    if (this.reviews().length === 0 && !this.isLoadingReviews()) {
      this.loadReviews();
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onClose(): void {
    this.close.emit();
  }

  onSelectSchedule(schedule: Schedule): void {
    if (this.movie) {
      this.scheduleSelected.emit({ movie: this.movie, schedule });
    }
  }
}
