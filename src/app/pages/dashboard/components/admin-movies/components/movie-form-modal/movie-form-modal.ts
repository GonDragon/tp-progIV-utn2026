import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Movie } from '../../../../../../models/movie';
import { PosterUpload } from '../poster-upload/poster-upload';

export interface MovieFormData {
  id?: string;
  title: string;
  synopsis: string;
  duration: number;
  ageRestriction: string;
  genres: string[];
  imageUrl: string;
  regularPrice: number;
}

@Component({
  selector: 'app-movie-form-modal',
  standalone: true,
  imports: [FormsModule, PosterUpload],
  templateUrl: './movie-form-modal.html',
  styleUrl: './movie-form-modal.css'
})
export class MovieFormModal {
  readonly movie = input<Movie | null>(null);
  readonly availableGenres = input<string[]>([]);
  readonly isSaving = input<boolean>(false);

  readonly save = output<MovieFormData>();
  readonly close = output<void>();

  movieTitle = '';
  movieSynopsis = '';
  movieDuration = 120;
  movieAgeRestriction = 'ATP';
  selectedGenres: string[] = ['Acción'];
  movieImageUrl = '';
  movieRegularPrice = 5500;

  constructor() {
    effect(() => {
      const current = this.movie();
      if (current) {
        this.movieTitle = current.title;
        this.movieSynopsis = current.synopsis;
        this.movieDuration = current.duration;
        this.movieAgeRestriction = current.ageRestriction || 'ATP';
        this.selectedGenres = current.genres && current.genres.length > 0 ? [...current.genres] : ['Acción'];
        this.movieImageUrl = current.imageUrl || '';
        this.movieRegularPrice = current.regularPrice || 5500;
      } else {
        this.resetForm();
      }
    });
  }

  resetForm(): void {
    this.movieTitle = '';
    this.movieSynopsis = '';
    this.movieDuration = 120;
    this.movieAgeRestriction = 'ATP';
    this.selectedGenres = ['Acción'];
    this.movieImageUrl = '';
    this.movieRegularPrice = 5500;
  }

  toggleGenre(genre: string): void {
    if (this.selectedGenres.includes(genre)) {
      if (this.selectedGenres.length > 1) {
        this.selectedGenres = this.selectedGenres.filter(g => g !== genre);
      }
    } else {
      this.selectedGenres = [...this.selectedGenres, genre];
    }
  }

  onSubmit(): void {
    if (!this.movieTitle.trim()) return;

    this.save.emit({
      id: this.movie()?.id,
      title: this.movieTitle.trim(),
      synopsis: this.movieSynopsis.trim() || 'Sin sinopsis disponible.',
      duration: Number(this.movieDuration) || 120,
      ageRestriction: this.movieAgeRestriction,
      genres: this.selectedGenres,
      imageUrl: this.movieImageUrl.trim(),
      regularPrice: Number(this.movieRegularPrice) || 5500
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
