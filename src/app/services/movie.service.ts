import { Injectable, signal, computed } from '@angular/core';
import { Movie } from '../models/movie';
import { MOCK_MOVIES, MOCK_UPCOMING_MOVIES, ALL_GENRES } from '../data/mock-movies';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private readonly _movies = signal<Movie[]>(MOCK_MOVIES);
  private readonly _upcomingMovies = signal<Movie[]>(MOCK_UPCOMING_MOVIES);
  private readonly _selectedGenres = signal<string[]>([]);
  private readonly _searchQuery = signal<string>('');

  readonly allGenres = ALL_GENRES;
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
}
