import { create } from "zustand";
import { format } from "date-fns";
import { activeBookingsOn, isActive } from "@/lib/booking/bookings";
import { getSupabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
import {
  toBlockedDate,
  toBooking,
  toDbScheduleType,
  toEventType,
  toNotification,
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
  EventType,
  Notification,
  ScheduleType,
  TimeRange,
  WeeklySchedule,
} from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface BlockDatesResult {
  blocked: string[];
  needsConfirm: { fecha: string; bookings: Booking[] }[];
  errors: string[];
}

const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

const EMPTY_PROFILE: AdminProfile = {
  id: "",
  nombre: "",
  email: "",
  timezone: "America/Argentina/Buenos_Aires",
  slug: "",
};

const DEFAULT_SETTINGS: BookingSettings = {
  intervaloMin: 10,
  antelacionMinHoras: 2,
  antelacionMaxDias: 30,
  limiteReservasDia: 8,
};

interface AgendaData {
  profile: AdminProfile;
  eventTypes: EventType[];
  weeklySchedules: WeeklySchedule[];
  blockedDates: BlockedDate[];
  settings: BookingSettings;
  bookings: Booking[];
  notifications: Notification[];
}

interface AgendaState extends AgendaData {
  status: "idle" | "loading" | "ready";
  isAuthenticated: boolean;
}

interface AgendaActions {
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<ActionResult>;
  signUp: (
    nombre: string,
    email: string,
    password: string
  ) => Promise<ActionResult & { needsConfirmation?: boolean }>;
  requestPasswordReset: (email: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<AdminProfile>) => Promise<ActionResult>;
  addEventType: (data: Omit<EventType, "id" | "adminId">) => Promise<ActionResult>;
  updateEventType: (id: string, data: Partial<EventType>) => Promise<ActionResult>;
  toggleEventType: (id: string) => Promise<ActionResult>;
  deleteEventType: (id: string) => Promise<ActionResult>;
  updateSettings: (settings: Partial<BookingSettings>) => Promise<ActionResult>;
  setWeeklySchedule: (
    diaSemana: number,
    franjas: TimeRange[],
    tipo: ScheduleType,
    fechaInicio?: string
  ) => Promise<ActionResult>;
  updateWeeklySchedule: (
    id: string,
    diaSemana: number,
    franjas: TimeRange[],
    tipo: ScheduleType,
    fechaInicio?: string
  ) => Promise<ActionResult>;
  removeWeeklySchedule: (id: string) => Promise<ActionResult>;
  toggleBlockedDate: (
    fecha: string,
    motivo?: string
  ) => Promise<{
    action: "blocked" | "unblocked" | "needs_confirm" | "error";
    bookings: Booking[];
    error?: string;
  }>;
  confirmBlockDate: (fecha: string, motivo?: string) => Promise<ActionResult>;
  /** Bloquea varias fechas; las que tienen reservas activas quedan en `needsConfirm` sin bloquear. */
  blockDates: (fechas: string[], motivo?: string) => Promise<BlockDatesResult>;
  /** Bloquea las fechas cancelando sus reservas activas (con aviso a cada invitado). */
  confirmBlockDates: (fechas: string[], motivo?: string) => Promise<ActionResult>;
  unblockDate: (fecha: string) => Promise<ActionResult>;
  confirmBooking: (id: string) => Promise<ActionResult>;
  approveBooking: (id: string) => Promise<ActionResult>;
  cancelBooking: (id: string) => Promise<ActionResult>;
  completeBooking: (id: string) => Promise<ActionResult>;
  rescheduleBooking: (
    id: string,
    fecha: string,
    horaInicio: string,
    horaFin: string
  ) => Promise<ActionResult>;
  markAllNotificationsRead: () => Promise<void>;
}

type AgendaStore = AgendaState & AgendaActions;

const emptyData = (): AgendaData => ({
  profile: EMPTY_PROFILE,
  eventTypes: [],
  weeklySchedules: [],
  blockedDates: [],
  settings: DEFAULT_SETTINGS,
  bookings: [],
  notifications: [],
});

let authSubscribed = false;

export const useAgendaStore = create<AgendaStore>()((set, get) => {
  const supabase = () => getSupabase();
  const uid = () => get().profile.id;

  const fetchSchedules = async () => {
    const { data, error } = await supabase()
      .from("horarios_semanales")
      .select("*, franjas_horarias(*)")
      .eq("admin_id", uid())
      .order("dia_semana")
      .order("fecha_inicio");
    if (error) throw error;
    set({ weeklySchedules: (data as HorarioConFranjas[]).map(toWeeklySchedule) });
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase()
      .from("reservas")
      .select("*")
      .eq("admin_id", uid())
      .order("fecha")
      .order("hora_inicio");
    if (error) throw error;
    set({ bookings: data.map(toBooking) });
  };

  const fetchBlockedDates = async () => {
    const { data, error } = await supabase()
      .from("dias_bloqueados")
      .select("*")
      .eq("admin_id", uid())
      .order("fecha");
    if (error) throw error;
    set({ blockedDates: data.map(toBlockedDate) });
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase()
      .from("notificaciones")
      .select("*")
      .eq("admin_id", uid())
      .eq("canal", "interno")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    set({ notifications: data.map(toNotification) });
  };

  const updateBookingState = async (
    id: string,
    estado: Booking["estado"]
  ): Promise<ActionResult> => {
    const { error } = await supabase().from("reservas").update({ estado }).eq("id", id);
    if (error) return fail(errorMessage(error));
    await Promise.all([fetchBookings(), fetchNotifications()]);
    return OK;
  };

  return {
    ...emptyData(),
    status: "idle",
    isAuthenticated: false,

    init: async () => {
      if (get().status !== "idle") return;
      set({ status: "loading" });

      if (!authSubscribed) {
        authSubscribed = true;
        supabase().auth.onAuthStateChange((event) => {
          if (event === "SIGNED_OUT") {
            set({ ...emptyData(), isAuthenticated: false, status: "ready" });
          }
        });
      }

      const { data } = await supabase().auth.getSession();
      if (data.session) {
        try {
          await get().loadAll();
          set({ isAuthenticated: true });
        } catch {
          await supabase().auth.signOut();
        }
      }
      set({ status: "ready" });
    },

    login: async (email, password) => {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) {
        if (error.code === "email_not_confirmed") {
          return fail("Confirmá tu email antes de ingresar (revisá tu bandeja de entrada).");
        }
        return fail("Email o contraseña incorrectos.");
      }
      try {
        await get().loadAll();
      } catch {
        return fail("No se pudieron cargar los datos de tu cuenta.");
      }
      set({ isAuthenticated: true, status: "ready" });
      return OK;
    },

    signUp: async (nombre, email, password) => {
      const { data, error } = await supabase().auth.signUp({
        email,
        password,
        options: {
          data: { nombre },
          emailRedirectTo: `${window.location.origin}/admin/login`,
        },
      });
      if (error) {
        if (error.code === "weak_password") {
          return fail("La contraseña debe tener al menos 6 caracteres.");
        }
        if (error.code === "user_already_exists") {
          return fail("Ya existe una cuenta con ese email.");
        }
        return fail(error.message);
      }
      if (data.user && data.user.identities?.length === 0) {
        return fail("Ya existe una cuenta con ese email.");
      }
      if (!data.session) return { ok: true, needsConfirmation: true };

      await get().loadAll();
      set({ isAuthenticated: true, status: "ready" });
      return OK;
    },

    requestPasswordReset: async (email) => {
      const { error } = await supabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/recuperar`,
      });
      return error ? fail(errorMessage(error)) : OK;
    },

    logout: async () => {
      await supabase().auth.signOut();
      set({ ...emptyData(), isAuthenticated: false });
    },

    loadAll: async () => {
      const db = supabase();
      const { data: userData, error: userError } = await db.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sin sesión");
      const id = userData.user.id;

      const [perfil, config, eventos] = await Promise.all([
        db.from("perfiles").select("*").eq("id", id).single(),
        db.from("configuracion_reservas").select("*").eq("admin_id", id).single(),
        db.from("tipos_evento").select("*").eq("admin_id", id).order("created_at"),
      ]);
      if (perfil.error) throw perfil.error;
      if (config.error) throw config.error;
      if (eventos.error) throw eventos.error;

      set({
        profile: toProfile(perfil.data),
        settings: toSettings(config.data),
        eventTypes: eventos.data.map(toEventType),
      });

      await Promise.all([
        fetchSchedules(),
        fetchBlockedDates(),
        fetchBookings(),
        fetchNotifications(),
      ]);
    },

    refresh: async () => {
      if (!get().isAuthenticated) return;
      try {
        await Promise.all([fetchBookings(), fetchNotifications()]);
      } catch {
        // Se reintenta en el próximo ciclo de refresco.
      }
    },

    updateProfile: async (data) => {
      const { data: row, error } = await supabase()
        .from("perfiles")
        .update({
          nombre: data.nombre,
          email: data.email,
          foto_url: data.foto === undefined ? undefined : data.foto || null,
          zona_horaria: data.timezone,
          slug: data.slug,
        })
        .eq("id", uid())
        .select()
        .single();
      if (error) {
        if (error.code === "23505") return fail("Ese enlace público ya está en uso. Elegí otro.");
        if (error.code === "23514") {
          return fail(
            "Revisá los datos: el enlace solo admite minúsculas, números y guiones (3 a 50 caracteres)."
          );
        }
        return fail(errorMessage(error));
      }
      set({ profile: toProfile(row) });
      return OK;
    },

    addEventType: async (data) => {
      const { data: row, error } = await supabase()
        .from("tipos_evento")
        .insert({
          admin_id: uid(),
          nombre: data.nombre,
          duracion_min: data.duracionMin,
          modalidad: data.modalidad,
          confirmacion_auto: data.confirmacionAuto,
          descripcion: data.descripcion,
          activo: data.activo,
        })
        .select()
        .single();
      if (error) return fail(errorMessage(error));
      set((s) => ({ eventTypes: [...s.eventTypes, toEventType(row)] }));
      return OK;
    },

    updateEventType: async (id, data) => {
      const { data: row, error } = await supabase()
        .from("tipos_evento")
        .update({
          nombre: data.nombre,
          duracion_min: data.duracionMin,
          modalidad: data.modalidad,
          confirmacion_auto: data.confirmacionAuto,
          descripcion: data.descripcion,
          activo: data.activo,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return fail(errorMessage(error));
      set((s) => ({
        eventTypes: s.eventTypes.map((e) => (e.id === id ? toEventType(row) : e)),
      }));
      return OK;
    },

    toggleEventType: async (id) => {
      const evt = get().eventTypes.find((e) => e.id === id);
      if (!evt) return fail("El evento no existe.");
      return get().updateEventType(id, { activo: !evt.activo });
    },

    deleteEventType: async (id) => {
      const { error } = await supabase().from("tipos_evento").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          return fail(
            "No se puede eliminar porque tiene reservas registradas. Desactivalo para que no se pueda reservar."
          );
        }
        return fail(errorMessage(error));
      }
      set((s) => ({ eventTypes: s.eventTypes.filter((e) => e.id !== id) }));
      return OK;
    },

    updateSettings: async (settings) => {
      const { data: row, error } = await supabase()
        .from("configuracion_reservas")
        .update({
          intervalo_min: settings.intervaloMin,
          antelacion_min_horas: settings.antelacionMinHoras,
          antelacion_max_dias: settings.antelacionMaxDias,
          limite_reservas_dia: settings.limiteReservasDia,
        })
        .eq("admin_id", uid())
        .select()
        .single();
      if (error) {
        if (error.code === "23514") {
          return fail("Revisá los valores: la antelación máxima y el límite diario deben ser mayores a cero.");
        }
        return fail(errorMessage(error));
      }
      set({ settings: toSettings(row) });
      return OK;
    },

    setWeeklySchedule: async (diaSemana, franjas, tipo, fechaInicio) => {
      const fecha = fechaInicio ?? format(new Date(), "yyyy-MM-dd");
      // Un horario de "única vez" siempre corresponde al día de la semana de su fecha.
      const dia = tipo === "once" ? new Date(`${fecha}T00:00:00`).getDay() : diaSemana;

      const db = supabase();
      const { data: horario, error } = await db
        .from("horarios_semanales")
        .upsert(
          { admin_id: uid(), dia_semana: dia, tipo: toDbScheduleType(tipo), fecha_inicio: fecha },
          { onConflict: "admin_id,dia_semana,tipo,fecha_inicio" }
        )
        .select()
        .single();
      if (error) return fail(errorMessage(error));

      const { error: deleteError } = await db
        .from("franjas_horarias")
        .delete()
        .eq("horario_id", horario.id);
      if (deleteError) return fail(errorMessage(deleteError));

      const { error: insertError } = await db.from("franjas_horarias").insert(
        franjas.map((f) => ({ horario_id: horario.id, hora_inicio: f.inicio, hora_fin: f.fin }))
      );
      if (insertError) {
        await fetchSchedules();
        if (insertError.code === "23514") {
          return fail("La hora de fin debe ser posterior a la de inicio.");
        }
        return fail(errorMessage(insertError));
      }

      await fetchSchedules();
      return OK;
    },

    updateWeeklySchedule: async (id, diaSemana, franjas, tipo, fechaInicio) => {
      const prev = get().weeklySchedules.find((s) => s.id === id);
      if (!prev) return fail("El horario no existe.");
      const result = await get().setWeeklySchedule(diaSemana, franjas, tipo, fechaInicio);
      if (!result.ok) return result;
      // El upsert reutiliza la fila solo si no cambió el día, el tipo ni la fecha.
      const fecha = fechaInicio ?? format(new Date(), "yyyy-MM-dd");
      const dia = tipo === "once" ? new Date(`${fecha}T00:00:00`).getDay() : diaSemana;
      const sameRow = prev.diaSemana === dia && prev.tipo === tipo && prev.fechaInicio === fecha;
      return sameRow ? OK : get().removeWeeklySchedule(id);
    },

    removeWeeklySchedule: async (id) => {
      const sched = get().weeklySchedules.find((s) => s.id === id);
      if (!sched) return fail("El horario no existe.");

      const today = format(new Date(), "yyyy-MM-dd");
      const hasBookings = get().bookings.some((b) => {
        if (!isActive(b) || b.fecha < today) return false;
        if (sched.tipo === "once") return b.fecha === sched.fechaInicio;
        return (
          new Date(`${b.fecha}T00:00:00`).getDay() === sched.diaSemana &&
          (!sched.fechaInicio || b.fecha >= sched.fechaInicio)
        );
      });
      if (hasBookings) {
        return fail("No se pudieron eliminar horarios laborales con reservas preexistentes.");
      }

      const { error } = await supabase().from("horarios_semanales").delete().eq("id", id);
      if (error) return fail(errorMessage(error));
      set((s) => ({ weeklySchedules: s.weeklySchedules.filter((ws) => ws.id !== id) }));
      return OK;
    },

    toggleBlockedDate: async (fecha, motivo) => {
      const db = supabase();

      if (get().blockedDates.some((b) => b.fecha === fecha)) {
        const { error } = await db
          .from("dias_bloqueados")
          .delete()
          .eq("admin_id", uid())
          .eq("fecha", fecha);
        if (error) return { action: "error", bookings: [], error: errorMessage(error) };
        set((s) => ({ blockedDates: s.blockedDates.filter((b) => b.fecha !== fecha) }));
        return { action: "unblocked", bookings: [] };
      }

      const { data, error } = await db.rpc("bloquear_dia", { p_fecha: fecha, p_motivo: motivo });
      if (error) return { action: "error", bookings: [], error: errorMessage(error) };

      if ((data as { accion: string }).accion === "requiere_confirmacion") {
        await fetchBookings();
        const affected = activeBookingsOn(get().bookings, fecha);
        return { action: "needs_confirm", bookings: affected };
      }

      await fetchBlockedDates();
      return { action: "blocked", bookings: [] };
    },

    confirmBlockDate: async (fecha, motivo) => {
      const { error } = await supabase().rpc("bloquear_dia", {
        p_fecha: fecha,
        p_motivo: motivo,
        p_cancelar_reservas: true,
      });
      if (error) return fail(errorMessage(error));
      await Promise.all([fetchBlockedDates(), fetchBookings(), fetchNotifications()]);
      return OK;
    },

    blockDates: async (fechas, motivo) => {
      const out: BlockDatesResult = { blocked: [], needsConfirm: [], errors: [] };
      for (const fecha of fechas) {
        const { data, error } = await supabase().rpc("bloquear_dia", { p_fecha: fecha, p_motivo: motivo });
        if (error) out.errors.push(errorMessage(error));
        else if ((data as { accion: string }).accion === "requiere_confirmacion") {
          out.needsConfirm.push({ fecha, bookings: [] });
        } else out.blocked.push(fecha);
      }
      if (out.needsConfirm.length > 0) {
        await fetchBookings();
        const all = get().bookings;
        out.needsConfirm = out.needsConfirm.map(({ fecha }) => ({
          fecha,
          bookings: activeBookingsOn(all, fecha),
        }));
      }
      if (out.blocked.length > 0) await fetchBlockedDates();
      return out;
    },

    confirmBlockDates: async (fechas, motivo) => {
      let result: ActionResult = OK;
      for (const fecha of fechas) {
        const { error } = await supabase().rpc("bloquear_dia", {
          p_fecha: fecha,
          p_motivo: motivo,
          p_cancelar_reservas: true,
        });
        if (error) {
          result = fail(errorMessage(error));
          break;
        }
      }
      await Promise.all([fetchBlockedDates(), fetchBookings(), fetchNotifications()]);
      return result;
    },

    unblockDate: async (fecha) => {
      const { error } = await supabase()
        .from("dias_bloqueados")
        .delete()
        .eq("admin_id", uid())
        .eq("fecha", fecha);
      if (error) return fail(errorMessage(error));
      set((s) => ({ blockedDates: s.blockedDates.filter((b) => b.fecha !== fecha) }));
      return OK;
    },

    confirmBooking: (id) => updateBookingState(id, "confirmada"),

    approveBooking: (id) => updateBookingState(id, "confirmada"),

    cancelBooking: (id) => updateBookingState(id, "cancelada"),

    completeBooking: (id) => updateBookingState(id, "completada"),

    rescheduleBooking: async (id, fecha, horaInicio, horaFin) => {
      const { error } = await supabase()
        .from("reservas")
        .update({ fecha, hora_inicio: horaInicio, hora_fin: horaFin })
        .eq("id", id);
      if (error) {
        if (error.code === "23P01") return fail("El horario seleccionado no está disponible.");
        return fail(errorMessage(error));
      }
      await Promise.all([fetchBookings(), fetchNotifications()]);
      return OK;
    },

    markAllNotificationsRead: async () => {
      if (!get().notifications.some((n) => !n.leida)) return;
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, leida: true })) }));
      await supabase()
        .from("notificaciones")
        .update({ leida: true })
        .eq("admin_id", uid())
        .eq("leida", false);
    },
  };
});
