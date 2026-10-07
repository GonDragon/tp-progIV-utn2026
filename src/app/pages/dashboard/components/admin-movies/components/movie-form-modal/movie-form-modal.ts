import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
export class MovieFormModal implements OnChanges {
  @Input() movie: Movie | null = null;
  @Input() availableGenres: string[] = [];
  @Input() isSaving = false;

  @Output() save = new EventEmitter<MovieFormData>();
  @Output() close = new EventEmitter<void>();

  movieTitle = '';
  movieSynopsis = '';
  movieDuration = 120;
  movieAgeRestriction = 'ATP';
  selectedGenres: string[] = ['Acción'];
  movieImageUrl = '';
  movieRegularPrice = 5500;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.movie) {
      this.movieTitle = this.movie.title;
      this.movieSynopsis = this.movie.synopsis;
      this.movieDuration = this.movie.duration;
      this.movieAgeRestriction = this.movie.ageRestriction || 'ATP';
      this.selectedGenres = this.movie.genres && this.movie.genres.length > 0 ? [...this.movie.genres] : ['Acción'];
      this.movieImageUrl = this.movie.imageUrl || '';
      this.movieRegularPrice = this.movie.regularPrice || 5500;
    } else {
      this.resetForm();
    }
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
      id: this.movie?.id,
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
