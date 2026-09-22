export interface Schedule {
  id: string;
  time: string;
  format: '2D' | '3D' | '4D' | '5D';
  language: 'Castellano' | 'Subtitulada';
  room: string;
  isPresale?: boolean;
}

export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  duration: number; // in minutes
  genres: string[];
  ageRestriction: 'ATP' | '+13' | '+18';
  rating: number; // e.g. 4.7
  reviewsCount: number;
  ticketsSold: number;
  isHighlighted?: boolean;
  isUpcoming?: boolean;
  releaseDate?: string;
  notificationSubscribed?: boolean;
  placeholderColor: string; // solid color for placeholder image
  schedules?: Schedule[];
}
