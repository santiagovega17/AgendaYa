import { makeSlotId } from "@/lib/availability/generateSlots";
import type {
  AdminProfile,
  BlockedDate,
  Booking,
  BookingSettings,
  BusyRange,
  EventType,
  Notification,
  ScheduleType,
  SlotLock,
  WeeklySchedule,
} from "@/lib/types";
import type { Database, Tables } from "./database.types";

type DbScheduleType = Database["public"]["Enums"]["tipo_horario"];
type BusyRow = Database["public"]["Functions"]["turnos_ocupados"]["Returns"][number];

export type HorarioConFranjas = Tables<"horarios_semanales"> & {
  franjas_horarias: Tables<"franjas_horarias">[];
};

/** Postgres devuelve `time` como HH:mm:ss; la app trabaja con HH:mm. */
export const hhmm = (time: string) => time.slice(0, 5);

export const toDbScheduleType = (tipo: ScheduleType): DbScheduleType =>
  tipo === "permanent" ? "permanente" : "unica_vez";

export function toProfile(row: Tables<"perfiles">): AdminProfile {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    foto: row.foto_url ?? undefined,
    timezone: row.zona_horaria,
    slug: row.slug,
  };
}

export function toSettings(row: Tables<"configuracion_reservas">): BookingSettings {
  return {
    intervaloMin: row.intervalo_min,
    antelacionMinHoras: row.antelacion_min_horas,
    antelacionMaxDias: row.antelacion_max_dias,
    limiteReservasDia: row.limite_reservas_dia,
  };
}

export function toEventType(row: Tables<"tipos_evento">): EventType {
  return {
    id: row.id,
    adminId: row.admin_id,
    nombre: row.nombre,
    duracionMin: row.duracion_min,
    modalidad: row.modalidad,
    confirmacionAuto: row.confirmacion_auto,
    descripcion: row.descripcion,
    activo: row.activo,
  };
}

export function toWeeklySchedule(row: HorarioConFranjas): WeeklySchedule {
  return {
    id: row.id,
    diaSemana: row.dia_semana,
    franjas: row.franjas_horarias
      .map((f) => ({ inicio: hhmm(f.hora_inicio), fin: hhmm(f.hora_fin) }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    tipo: row.tipo === "permanente" ? "permanent" : "once",
    fechaInicio: row.fecha_inicio,
  };
}

export function toBlockedDate(row: Tables<"dias_bloqueados">): BlockedDate {
  return { fecha: row.fecha, motivo: row.motivo ?? undefined };
}

export function toBooking(row: Tables<"reservas">): Booking {
  return {
    id: row.id,
    numeroReserva: row.numero_reserva,
    eventTypeId: row.tipo_evento_id,
    fecha: row.fecha,
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    invitado: {
      nombre: row.invitado_nombre,
      apellido: row.invitado_apellido,
      email: row.invitado_email,
      telefono: row.invitado_telefono,
      nota: row.invitado_nota ?? undefined,
    },
    estado: row.estado,
    createdAt: row.created_at,
  };
}

export function toNotification(row: Tables<"notificaciones">): Notification {
  return {
    id: row.id,
    tipo: row.tipo,
    destinatario: row.destinatario,
    mensaje: row.mensaje,
    leida: row.leida,
    createdAt: row.created_at,
  };
}

/**
 * Convierte los turnos ocupados (sin datos personales) al formato que espera
 * `generateSlots`, más los rangos crudos para detectar superposiciones entre eventos.
 */
export function fromBusyRows(rows: BusyRow[], sessionId: string) {
  const bookings: Booking[] = [];
  const locks: SlotLock[] = [];
  const ranges: BusyRange[] = [];

  rows.forEach((row, i) => {
    const horaInicio = hhmm(row.hora_inicio);
    const horaFin = hhmm(row.hora_fin);
    ranges.push({ fecha: row.fecha, horaInicio, horaFin, propio: row.es_propio });

    if (row.origen === "reserva") {
      bookings.push({
        id: `ocupado-${i}`,
        numeroReserva: "",
        eventTypeId: row.tipo_evento_id,
        fecha: row.fecha,
        horaInicio,
        horaFin,
        invitado: { nombre: "", apellido: "", email: "", telefono: "" },
        estado: "confirmada",
        createdAt: "",
      });
    } else {
      locks.push({
        slotId: makeSlotId(row.fecha, horaInicio, row.tipo_evento_id),
        eventTypeId: row.tipo_evento_id,
        fecha: row.fecha,
        horaInicio,
        sessionId: row.es_propio ? sessionId : "otra-sesion",
        expiresAt: row.expira_at,
      });
    }
  });

  return { bookings, locks, ranges };
}
