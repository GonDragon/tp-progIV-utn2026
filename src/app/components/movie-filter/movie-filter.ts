import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-movie-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './movie-filter.html',
  styleUrl: './movie-filter.css'
})
export class MovieFilter {
  @Input({ required: true }) genres: string[] = [];
  @Input({ required: true }) selectedGenres: string[] = [];
  @Input({ required: true }) searchQuery: string = '';

  @Output() searchChange = new EventEmitter<string>();
  @Output() genreToggled = new EventEmitter<string>();
  @Output() clearFilters = new EventEmitter<void>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  onToggleGenre(genre: string): void {
    this.genreToggled.emit(genre);
  }

  onClear(): void {
    this.clearFilters.emit();
  }

  isGenreSelected(genre: string): boolean {
    return (this.selectedGenres || []).includes(genre);
  }
}
