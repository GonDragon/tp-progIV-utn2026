export interface Schedule {
  id: string;
  time: string;
  format: '2D' | '3D' | '4D' | '5D' | string;
  language: 'Castellano' | 'Subtitulada' | string;
  room: string;
  isPresale?: boolean;
  basePrice?: number;
  salaId?: number;
  fechaHoraInicio?: string;
}

export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  duration: number; // in minutes
  genres: string[];
  ageRestriction: 'ATP' | '+13' | '+18' | 'Ninguna' | string;
  rating: number; // e.g. 4.7
  reviewsCount: number;
  ticketsSold: number;
  imageUrl?: string;
  isHighlighted?: boolean;
  isUpcoming?: boolean;
  isVisibleOnHome?: boolean;
  releaseDate?: string;
  notificationSubscribed?: boolean;
  regularPrice?: number;
  isPresaleEnabled?: boolean;
  presalePrice?: number;
  presaleStartDate?: string;
  presaleEndDate?: string;
  schedules?: Schedule[];
}

export interface Genre {
  id: number;
  nombre: string;
}

export interface Sala {
  id: number;
  nombre: string;
}
