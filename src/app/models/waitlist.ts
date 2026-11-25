import { Movie, Schedule } from './movie';

export type WaitlistStatus = 'en_espera' | 'notificado' | 'comprado' | 'expirado' | 'cancelado';

export interface WaitlistEntry {
  id: number;
  funcion_id: number;
  perfil_id: string;
  estado: WaitlistStatus;
  fecha_inscripcion: string;
  notificado_en?: string | null;
  expira_en?: string | null;
}

export interface UserWaitlistItem {
  id: number;
  funcionId: number;
  perfilId: string;
  estado: WaitlistStatus;
  fechaInscripcion: string;
  notificadoEn?: string | null;
  expiraEn?: string | null;
  position: number;
  totalInWaitlist: number;
  timeRemainingMinutes?: number | null;
  timeRemainingSeconds?: number | null;
  isNotifiedActive: boolean;
  movie: {
    id: number | string;
    title: string;
    posterUrl?: string;
    ageRestriction?: string;
    duration?: number;
  };
  schedule: {
    id: string;
    time: string;
    format: string;
    language: string;
    room: string;
    basePrice?: number;
    presalePrice?: number;
    isPresale?: boolean;
    fechaHoraInicio?: string;
    salaId?: number;
  };
  fullMovie?: Movie;
  fullSchedule?: Schedule;
}
