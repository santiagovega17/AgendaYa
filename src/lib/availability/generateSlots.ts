import { addMinutes, format, parse, isBefore, isAfter, addHours, addDays } from "date-fns";
import type {
  Booking,
  BookingSettings,
  BlockedDate,
  EventType,
  Slot,
  SlotLock,
  WeeklySchedule,
} from "@/lib/types";

function parseTime(dateStr: string, time: string): Date {
  return parse(`${dateStr} ${time}`, "yyyy-MM-dd HH:mm", new Date());
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getSchedulesForDate(
  dateStr: string,
  schedules: WeeklySchedule[]
): TimeRange[] {
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  const dayOfWeek = date.getDay();

  const matching = schedules.filter((s) => s.diaSemana === dayOfWeek);
  const franjas: TimeRange[] = [];

  for (const sched of matching) {
    if (sched.tipo === "permanent") {
      if (!sched.fechaInicio || dateStr >= sched.fechaInicio) {
        franjas.push(...sched.franjas);
      }
    } else if (sched.fechaInicio === dateStr) {
      franjas.push(...sched.franjas);
    }
  }

  return franjas;
}

interface TimeRange {
  inicio: string;
  fin: string;
}

export function makeSlotId(fecha: string, horaInicio: string, eventTypeId: string): string {
  return `${fecha}_${horaInicio}_${eventTypeId}`;
}

export function generateSlots(params: {
  fecha: string;
  eventType: EventType;
  weeklySchedules: WeeklySchedule[];
  blockedDates: BlockedDate[];
  bookings: Booking[];
  settings: BookingSettings;
  locks: SlotLock[];
  sessionId?: string;
  now?: Date;
}): Slot[] {
  const {
    fecha,
    eventType,
    weeklySchedules,
    blockedDates,
    bookings,
    settings,
    locks,
    sessionId,
    now = new Date(),
  } = params;

  if (blockedDates.some((b) => b.fecha === fecha)) {
    return [];
  }

  const franjas = getSchedulesForDate(fecha, weeklySchedules);
  if (franjas.length === 0) return [];

  const dateObj = parse(fecha, "yyyy-MM-dd", now);
  const minDate = addHours(now, settings.antelacionMinHoras);
  const maxDate = addDays(now, settings.antelacionMaxDias);

  if (isBefore(dateObj, new Date(format(now, "yyyy-MM-dd"))) || isAfter(dateObj, maxDate)) {
    return [];
  }

  const dayBookings = bookings.filter(
    (b) =>
      b.fecha === fecha &&
      b.eventTypeId === eventType.id &&
      (b.estado === "confirmada" || b.estado === "pendiente")
  );

  if (dayBookings.length >= settings.limiteReservasDia) {
    return [];
  }

  const slots: Slot[] = [];
  const slotDuration = eventType.duracionMin;
  const step = slotDuration + settings.intervaloMin;

  for (const franja of franjas) {
    let current = toMinutes(franja.inicio);
    const end = toMinutes(franja.fin);

    while (current + slotDuration <= end) {
      const horaInicio = fromMinutes(current);
      const horaFin = fromMinutes(current + slotDuration);
      const slotStart = parseTime(fecha, horaInicio);
      const id = makeSlotId(fecha, horaInicio, eventType.id);

      if (isBefore(slotStart, minDate)) {
        current += step;
        continue;
      }

      const booked = dayBookings.some(
        (b) => b.horaInicio === horaInicio
      );

      const activeLock = locks.find(
        (l) =>
          l.slotId === id &&
          new Date(l.expiresAt) > now &&
          l.sessionId !== sessionId
      );

      const ownLock = locks.find(
        (l) =>
          l.slotId === id &&
          new Date(l.expiresAt) > now &&
          l.sessionId === sessionId
      );

      slots.push({
        id,
        fecha,
        horaInicio,
        horaFin,
        disponible: !booked && !activeLock,
        lockExpiresAt: ownLock?.expiresAt ?? activeLock?.expiresAt,
        lockedBySession: ownLock?.sessionId ?? activeLock?.sessionId,
      });

      current += step;
    }
  }

  return slots;
}

export function getAvailableDates(params: {
  year: number;
  month: number;
  eventType: EventType;
  weeklySchedules: WeeklySchedule[];
  blockedDates: BlockedDate[];
  bookings: Booking[];
  settings: BookingSettings;
  locks: SlotLock[];
  sessionId?: string;
  now?: Date;
}): string[] {
  const { year, month, eventType, sessionId, ...rest } = params;
  const dates: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const fecha = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const slots = generateSlots({ fecha, eventType, sessionId, ...rest });
    if (slots.some((s) => s.disponible || s.lockedBySession)) {
      dates.push(fecha);
    }
  }

  return dates;
}
