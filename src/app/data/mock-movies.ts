import { Movie } from '../models/movie';

export const ALL_GENRES: string[] = [
  'Acción',
  'Ciencia Ficción',
  'Aventura',
  'Drama',
  'Comedia',
  'Terror',
  'Animación',
  'Suspenso',
  'Fantasía'
];

export const MOCK_MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'Duna: Odisea Espacial',
    synopsis: 'Un viaje mítico y cargado de emociones de un héroe destinado a asegurar el futuro de su pueblo en un planeta inhóspito.',
    duration: 165,
    genres: ['Ciencia Ficción', 'Aventura', 'Drama'],
    ageRestriction: '+13',
    rating: 4.9,
    reviewsCount: 342,
    ticketsSold: 12500,
    placeholderColor: '#1e3a8a', // Blue
    schedules: [
      { id: 's1-1', time: '15:30', format: '2D', language: 'Castellano', room: 'Sala 1' },
      { id: 's1-2', time: '18:45', format: '3D', language: 'Subtitulada', room: 'Sala 2', isPresale: true },
      { id: 's1-3', time: '22:00', format: '4D', language: 'Subtitulada', room: 'Sala IMAX' }
    ]
  },
  {
    id: 'm2',
    title: 'Guardianes del Abismo',
    synopsis: 'Un equipo de exploradores submarinos se enfrenta a horrores desconocidos tras descubrir una base sumergida ancestral.',
    duration: 130,
    genres: ['Acción', 'Suspenso', 'Terror'],
    ageRestriction: '+18',
    rating: 4.7,
    reviewsCount: 218,
    ticketsSold: 9800,
    placeholderColor: '#7f1d1d', // Dark Red
    schedules: [
      { id: 's2-1', time: '16:00', format: '2D', language: 'Castellano', room: 'Sala 3' },
      { id: 's2-2', time: '19:15', format: '3D', language: 'Subtitulada', room: 'Sala 1' },
      { id: 's2-3', time: '22:30', format: '4D', language: 'Subtitulada', room: 'Sala 4' }
    ]
  },
  {
    id: 'm3',
    title: 'Aventura en el Reino Mágico',
    synopsis: 'Una joven heroína y sus carismáticos compañeros descubren secretos ancestrales para salvar su reino de las sombras.',
    duration: 105,
    genres: ['Animación', 'Aventura', 'Comedia', 'Fantasía'],
    ageRestriction: 'ATP',
    rating: 4.8,
    reviewsCount: 450,
    ticketsSold: 9200,
    placeholderColor: '#065f46', // Emerald
    schedules: [
      { id: 's3-1', time: '14:00', format: '2D', language: 'Castellano', room: 'Sala 5' },
      { id: 's3-2', time: '16:30', format: '3D', language: 'Castellano', room: 'Sala 5' },
      { id: 's3-3', time: '19:00', format: '2D', language: 'Castellano', room: 'Sala 3' }
    ]
  },
  {
    id: 'm4',
    title: 'Ecos de Medianoche',
    synopsis: 'En una ciudad silenciosa, un detective sigue pistas crípticas que lo conducen a confrontar su propio pasado.',
    duration: 120,
    genres: ['Drama', 'Suspenso'],
    ageRestriction: '+13',
    rating: 4.4,
    reviewsCount: 160,
    ticketsSold: 5400,
    placeholderColor: '#581c87', // Purple
    schedules: [
      { id: 's4-1', time: '17:00', format: '2D', language: 'Subtitulada', room: 'Sala 2' },
      { id: 's4-2', time: '20:00', format: '2D', language: 'Castellano', room: 'Sala 2' }
    ]
  },
  {
    id: 'm5',
    title: 'Velocidad Terminal 5',
    synopsis: 'Persecuciones extremas por las capitales más emblemáticas en una carrera contrarreloj sin retorno.',
    duration: 140,
    genres: ['Acción', 'Suspenso'],
    ageRestriction: '+13',
    rating: 4.2,
    reviewsCount: 195,
    ticketsSold: 6100,
    placeholderColor: '#b45309', // Amber / Orange
    schedules: [
      { id: 's5-1', time: '18:00', format: '2D', language: 'Castellano', room: 'Sala 4' },
      { id: 's5-2', time: '21:00', format: '5D', language: 'Subtitulada', room: 'Sala 4' }
    ]
  },
  {
    id: 'm6',
    title: 'Risas sin Fronteras',
    synopsis: 'Dos familias completamente opuestas se ven obligadas a convivir en las vacaciones más desastrosas y divertidas.',
    duration: 98,
    genres: ['Comedia', 'Drama'],
    ageRestriction: 'ATP',
    rating: 4.5,
    reviewsCount: 310,
    ticketsSold: 4800,
    placeholderColor: '#0e7490', // Cyan
    schedules: [
      { id: 's6-1', time: '15:00', format: '2D', language: 'Castellano', room: 'Sala 6' },
      { id: 's6-2', time: '17:30', format: '2D', language: 'Castellano', room: 'Sala 6' }
    ]
  }
];

export const MOCK_UPCOMING_MOVIES: Movie[] = [
  {
    id: 'u1',
    title: 'Crónicas de Andrómeda',
    synopsis: 'La primera expedición interestelar humana encuentra vestigios de una civilización que predijo su llegada.',
    duration: 155,
    genres: ['Ciencia Ficción', 'Aventura'],
    ageRestriction: '+13',
    rating: 0,
    reviewsCount: 0,
    ticketsSold: 0,
    isUpcoming: true,
    releaseDate: '15 de Octubre, 2026',
    notificationSubscribed: false,
    placeholderColor: '#312e81' // Indigo
  },
  {
    id: 'u2',
    title: 'La Mansión de las Sombras',
    synopsis: 'Un grupo de investigadores paranormales desentraña los oscuros rituales de una familia aristocrática del siglo XIX.',
    duration: 110,
    genres: ['Terror', 'Suspenso'],
    ageRestriction: '+18',
    rating: 0,
    reviewsCount: 0,
    ticketsSold: 0,
    isUpcoming: true,
    releaseDate: '29 de Octubre, 2026',
    notificationSubscribed: false,
    placeholderColor: '#450a0a' // Dark Crimson
  },
  {
    id: 'u3',
    title: 'Super Panda: Orígenes',
    synopsis: 'Un simpático panda descubre una gema milenaria que le otorga asombrosos poderes para defender el bosque místico.',
    duration: 95,
    genres: ['Animación', 'Comedia', 'Fantasía'],
    ageRestriction: 'ATP',
    rating: 0,
    reviewsCount: 0,
    ticketsSold: 0,
    isUpcoming: true,
    releaseDate: '12 de Noviembre, 2026',
    notificationSubscribed: true,
    placeholderColor: '#14532d' // Forest green
  },
  {
    id: 'u4',
    title: 'El Último Bastión',
    synopsis: 'Guerreros legendarios se reúnen para una última batalla contra una invasión implacable.',
    duration: 145,
    genres: ['Acción', 'Fantasía'],
    ageRestriction: '+13',
    rating: 0,
    reviewsCount: 0,
    ticketsSold: 0,
    isUpcoming: true,
    releaseDate: '26 de Noviembre, 2026',
    notificationSubscribed: false,
    placeholderColor: '#701a75' // Fuchsia / Purple
  }
];
