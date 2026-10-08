import { getSupabase, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/client";
import {
  fromBusyRows,
  hhmm,
  toBlockedDate,
  toEventType,
  toProfile,
  toSettings,
  toWeeklySchedule,
  type HorarioConFranjas,
} from "@/lib/supabase/mappers";
import type {
  AdminProfile,
  BlockedDate,
  Booking,
  BookingSettings,
  BusyRange,
  EventType,
  GuestData,
  SlotLock,
  WeeklySchedule,
} from "@/lib/types";

interface DbError {
  code?: string;
  message?: string;
}

export interface PublicAgenda {
  profile: AdminProfile;
  eventTypes: EventType[];
  weeklySchedules: WeeklySchedule[];
  blockedDates: BlockedDate[];
  settings: BookingSettings;
}

export interface BusySlots {
  bookings: Booking[];
  locks: SlotLock[];
  ranges: BusyRange[];
}

export type ConfirmedBooking = Pick<
  Booking,
  "id" | "numeroReserva" | "eventTypeId" | "fecha" | "horaInicio" | "horaFin" | "estado"
>;

/** Datos públicos del enlace de agenda. Devuelve null si el slug no existe. */
export async function fetchPublicAgenda(slug: string, today: string): Promise<PublicAgenda | null> {
  const db = getSupabase();
  const { data: perfil, error } = await db.from("perfiles").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!perfil) return null;

  const [eventos, config, horarios, bloqueados] = await Promise.all([
    db.from("tipos_evento").select("*").eq("admin_id", perfil.id).eq("activo", true).order("created_at"),
    db.from("configuracion_reservas").select("*").eq("admin_id", perfil.id).single(),
    db.from("horarios_semanales").select("*, franjas_horarias(*)").eq("admin_id", perfil.id),
    db.from("dias_bloqueados").select("*").eq("admin_id", perfil.id).gte("fecha", today),
  ]);
  if (eventos.error) throw eventos.error;
  if (config.error) throw config.error;
  if (horarios.error) throw horarios.error;
  if (bloqueados.error) throw bloqueados.error;

  return {
    profile: toProfile(perfil),
    eventTypes: eventos.data.map(toEventType),
    weeklySchedules: (horarios.data as HorarioConFranjas[]).map(toWeeklySchedule),
    blockedDates: bloqueados.data.map(toBlockedDate),
    settings: toSettings(config.data),
  };
}

/** Reservas activas y bloqueos temporales vigentes del administrador, sin datos personales. */
export async function fetchBusySlots(
  adminId: string,
  desde: string,
  hasta: string,
  sessionId: string,
): Promise<BusySlots> {
  const { data, error } = await getSupabase().rpc("turnos_ocupados", {
    p_admin_id: adminId,
    p_desde: desde,
    p_hasta: hasta,
    p_session_id: sessionId,
  });
  if (error) throw error;
  return fromBusyRows(data, sessionId);
}

/** Bloquea el turno durante 15 minutos para esta sesión (AYA-M04-RF05). */
export async function lockSlot(params: {
  eventTypeId: string;
  fecha: string;
  horaInicio: string;
  sessionId: string;
}): Promise<{ expiresAt: string; error?: never } | { expiresAt?: never; error: DbError }> {
  const { data, error } = await getSupabase().rpc("bloquear_turno", {
    p_tipo_evento_id: params.eventTypeId,
    p_fecha: params.fecha,
    p_hora_inicio: params.horaInicio,
    p_session_id: params.sessionId,
  });
  if (error) return { error };
  return { expiresAt: data };
}

export async function confirmBooking(params: {
  eventTypeId: string;
  fecha: string;
  horaInicio: string;
  sessionId: string;
  invitado: GuestData;
}): Promise<{ booking: ConfirmedBooking; error?: never } | { booking?: never; error: DbError }> {
  const { invitado } = params;
  const { data, error } = await getSupabase().rpc("confirmar_reserva", {
    p_tipo_evento_id: params.eventTypeId,
    p_fecha: params.fecha,
    p_hora_inicio: params.horaInicio,
    p_session_id: params.sessionId,
    p_nombre: invitado.nombre,
    p_apellido: invitado.apellido,
    p_email: invitado.email,
    p_telefono: invitado.telefono,
    p_nota: invitado.nota || undefined,
  });
  if (error) return { error };

  const row = data as {
    id: string;
    numero_reserva: string;
    tipo_evento_id: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    estado: Booking["estado"];
  };
  return {
    booking: {
      id: row.id,
      numeroReserva: row.numero_reserva,
      eventTypeId: row.tipo_evento_id,
      fecha: row.fecha,
      horaInicio: hhmm(row.hora_inicio),
      horaFin: hhmm(row.hora_fin),
      estado: row.estado,
    },
  };
}

/**
 * Libera los turnos bloqueados por la sesión. Usa `keepalive` para que el pedido
 * llegue aunque el usuario esté cerrando la pestaña.
 */
export function releaseSessionLocks(sessionId: string): void {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/liberar_turnos`, {
    method: "POST",
    keepalive: true,
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_session_id: sessionId }),
  }).catch(() => {});
}
