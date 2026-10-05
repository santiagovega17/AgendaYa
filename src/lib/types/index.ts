export type BookingStatus = "pendiente" | "confirmada" | "completada" | "cancelada";
export type ScheduleType = "once" | "permanent";
export type Modality = "presencial" | "virtual" | "ambas";
export type NotificationType =
  | "reserva_confirmada"
  | "reserva_cancelada"
  | "reserva_pendiente"
  | "reserva_reagendada"
  | "recordatorio"
  | "bloqueo_dia";

export interface AdminProfile {
  id: string;
  nombre: string;
  email: string;
  foto?: string;
  timezone: string;
  slug: string;
}

export interface TimeRange {
  inicio: string; // HH:mm
  fin: string;
}

export interface WeeklySchedule {
  id: string;
  diaSemana: number; // 0=Sunday, 6=Saturday
  franjas: TimeRange[];
  tipo: ScheduleType;
  fechaInicio?: string; // YYYY-MM-DD for permanent schedules
}

export interface BlockedDate {
  fecha: string; // YYYY-MM-DD
  motivo?: string;
}

export interface BookingSettings {
  intervaloMin: number;
  antelacionMinHoras: number;
  antelacionMaxDias: number;
  limiteReservasDia: number;
}

export interface EventType {
  id: string;
  adminId: string;
  nombre: string;
  duracionMin: number;
  modalidad: Modality;
  confirmacionAuto: boolean;
  descripcion: string;
  activo: boolean;
}

export interface GuestData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  nota?: string;
}

export interface Booking {
  id: string;
  numeroReserva: string;
  eventTypeId: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string;
  invitado: GuestData;
  estado: BookingStatus;
  createdAt: string;
}

export interface SlotLock {
  slotId: string;
  eventTypeId: string;
  fecha: string;
  horaInicio: string;
  sessionId: string;
  expiresAt: string;
}

export interface Slot {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
  /** El horario ya pasó o no cumple la antelación mínima (AYA-M04-RF06). */
  vencido?: boolean;
  lockExpiresAt?: string;
  lockedBySession?: string;
}

export interface Notification {
  id: string;
  tipo: NotificationType;
  destinatario: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export interface BusyRange {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  propio: boolean;
}
