import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeedData } from "@/lib/mock/seed";
import { createNotification } from "@/lib/notifications/simulator";
import { cleanExpiredLocks, createSlotLock } from "@/lib/booking/locks";
import type {
  AdminProfile,
  AgendaState,
  BlockedDate,
  Booking,
  BookingSettings,
  EventType,
  GuestData,
  Notification,
  SlotLock,
  TimeRange,
  WeeklySchedule,
} from "@/lib/types";

interface AgendaActions {
  login: (email: string, password: string) => boolean;
  logout: () => void;
  resetToSeed: () => void;
  updateProfile: (data: Partial<AdminProfile>) => void;
  addEventType: (data: Omit<EventType, "id" | "adminId">) => void;
  updateEventType: (id: string, data: Partial<EventType>) => void;
  toggleEventType: (id: string) => void;
  deleteEventType: (id: string) => boolean;
  updateSettings: (settings: Partial<BookingSettings>) => void;
  setWeeklySchedule: (
    diaSemana: number,
    franjas: TimeRange[],
    tipo: "once" | "permanent",
    fechaInicio?: string
  ) => void;
  removeWeeklySchedule: (id: string) => boolean;
  toggleBlockedDate: (
    fecha: string,
    motivo?: string
  ) => { action: "blocked" | "unblocked" | "needs_confirm"; bookings: Booking[] };
  confirmBlockDate: (fecha: string, motivo?: string) => void;
  unblockDate: (fecha: string) => void;
  createBooking: (data: {
    eventTypeId: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    invitado: GuestData;
    autoConfirm: boolean;
  }) => Booking | null;
  cancelBooking: (id: string) => void;
  completeBooking: (id: string) => void;
  rescheduleBooking: (id: string, fecha: string, horaInicio: string, horaFin: string) => boolean;
  lockSlot: (params: {
    slotId: string;
    eventTypeId: string;
    fecha: string;
    horaInicio: string;
    sessionId: string;
  }) => void;
  releaseSlot: (slotId: string, sessionId: string) => void;
  releaseSessionLocks: (sessionId: string) => void;
  cleanLocks: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  bumpScheduleVersion: () => void;
  getAdminBySlug: (slug: string) => AdminProfile | null;
}

type AgendaStore = AgendaState & AgendaActions;

let bookingCounter = 1003;

export const useAgendaStore = create<AgendaStore>()(
  persist(
    (set, get) => ({
      ...createSeedData(),

      login: (email, password) => {
        if (email && password.length >= 4) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false }),

      resetToSeed: () => set(createSeedData()),

      updateProfile: (data) =>
        set((s) => ({ profile: { ...s.profile, ...data } })),

      addEventType: (data) =>
        set((s) => ({
          eventTypes: [
            ...s.eventTypes,
            { ...data, id: crypto.randomUUID(), adminId: s.profile.id },
          ],
        })),

      updateEventType: (id, data) =>
        set((s) => ({
          eventTypes: s.eventTypes.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),

      toggleEventType: (id) =>
        set((s) => ({
          eventTypes: s.eventTypes.map((e) =>
            e.id === id ? { ...e, activo: !e.activo } : e
          ),
        })),

      deleteEventType: (id) => {
        const hasBookings = get().bookings.some(
          (b) => b.eventTypeId === id && b.estado !== "cancelada"
        );
        if (hasBookings) return false;
        set((s) => ({
          eventTypes: s.eventTypes.filter((e) => e.id !== id),
        }));
        return true;
      },

      updateSettings: (settings) =>
        set((s) => ({
          settings: { ...s.settings, ...settings },
          scheduleVersion: s.scheduleVersion + 1,
        })),

      setWeeklySchedule: (diaSemana, franjas, tipo, fechaInicio) =>
        set((s) => {
          const filtered = s.weeklySchedules.filter(
            (ws) =>
              !(ws.diaSemana === diaSemana && ws.tipo === tipo && ws.fechaInicio === fechaInicio)
          );
          const newSchedule: WeeklySchedule = {
            id: crypto.randomUUID(),
            diaSemana,
            franjas,
            tipo,
            fechaInicio: tipo === "permanent" ? fechaInicio ?? "2026-01-01" : fechaInicio,
          };
          return {
            weeklySchedules: [...filtered, newSchedule],
            scheduleVersion: s.scheduleVersion + 1,
          };
        }),

      removeWeeklySchedule: (id) => {
        const sched = get().weeklySchedules.find((s) => s.id === id);
        if (!sched) return false;
        const hasBookings = get().bookings.some((b) => {
          if (b.estado === "cancelada") return false;
          const d = new Date(b.fecha + "T00:00:00");
          return d.getDay() === sched.diaSemana;
        });
        if (hasBookings) return false;
        set((s) => ({
          weeklySchedules: s.weeklySchedules.filter((ws) => ws.id !== id),
          scheduleVersion: s.scheduleVersion + 1,
        }));
        return true;
      },

      toggleBlockedDate: (fecha, motivo) => {
        const existing = get().blockedDates.find((b) => b.fecha === fecha);
        if (existing) {
          set((s) => ({
            blockedDates: s.blockedDates.filter((b) => b.fecha !== fecha),
            scheduleVersion: s.scheduleVersion + 1,
          }));
          return { action: "unblocked" as const, bookings: [] };
        }
        const affected = get().bookings.filter(
          (b) => b.fecha === fecha && b.estado !== "cancelada"
        );
        if (affected.length > 0) {
          return { action: "needs_confirm" as const, bookings: affected };
        }
        set((s) => ({
          blockedDates: [...s.blockedDates, { fecha, motivo }],
          scheduleVersion: s.scheduleVersion + 1,
        }));
        return { action: "blocked" as const, bookings: [] };
      },

      confirmBlockDate: (fecha, motivo) => {
        const affected = get().bookings.filter(
          (b) => b.fecha === fecha && b.estado !== "cancelada"
        );
        const notifications: Notification[] = affected.map((b) =>
          createNotification(
            "bloqueo_dia",
            b.invitado.email,
            `Tu reserva del ${fecha} fue cancelada por bloqueo de agenda.`
          )
        );
        set((s) => ({
          blockedDates: [...s.blockedDates, { fecha, motivo }],
          bookings: s.bookings.map((b) =>
            b.fecha === fecha && b.estado !== "cancelada"
              ? { ...b, estado: "cancelada" as const }
              : b
          ),
          notifications: [...notifications, ...s.notifications],
          scheduleVersion: s.scheduleVersion + 1,
        }));
      },

      unblockDate: (fecha) =>
        set((s) => ({
          blockedDates: s.blockedDates.filter((b) => b.fecha !== fecha),
          scheduleVersion: s.scheduleVersion + 1,
        })),

      createBooking: (data) => {
        const state = get();
        const conflict = state.bookings.some(
          (b) =>
            b.fecha === data.fecha &&
            b.horaInicio === data.horaInicio &&
            b.estado !== "cancelada"
        );
        if (conflict) return null;

        const numeroReserva = `AYA-${bookingCounter++}`;
        const booking: Booking = {
          id: crypto.randomUUID(),
          numeroReserva,
          eventTypeId: data.eventTypeId,
          fecha: data.fecha,
          horaInicio: data.horaInicio,
          horaFin: data.horaFin,
          invitado: data.invitado,
          estado: data.autoConfirm ? "confirmada" : "pendiente",
          createdAt: new Date().toISOString(),
        };

        const notifType = data.autoConfirm ? "reserva_confirmada" : "reserva_pendiente";
        const guestNotif = createNotification(
          notifType,
          data.invitado.email,
          `Reserva ${numeroReserva} ${data.autoConfirm ? "confirmada" : "pendiente de aprobación"}.`
        );
        const adminNotif = createNotification(
          notifType,
          state.profile.email,
          `Nueva reserva ${numeroReserva} de ${data.invitado.nombre} ${data.invitado.apellido}.`
        );

        set((s) => ({
          bookings: [...s.bookings, booking],
          slotLocks: s.slotLocks.filter(
            (l) => !(l.fecha === data.fecha && l.horaInicio === data.horaInicio)
          ),
          notifications: [guestNotif, adminNotif, ...s.notifications],
        }));

        return booking;
      },

      cancelBooking: (id) => {
        const booking = get().bookings.find((b) => b.id === id);
        if (!booking) return;
        const guestNotif = createNotification(
          "reserva_cancelada",
          booking.invitado.email,
          `Tu reserva ${booking.numeroReserva} fue cancelada.`
        );
        const adminNotif = createNotification(
          "reserva_cancelada",
          get().profile.email,
          `Reserva ${booking.numeroReserva} cancelada.`
        );
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, estado: "cancelada" as const } : b
          ),
          notifications: [guestNotif, adminNotif, ...s.notifications],
        }));
      },

      completeBooking: (id) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, estado: "completada" as const } : b
          ),
        })),

      rescheduleBooking: (id, fecha, horaInicio, horaFin) => {
        const conflict = get().bookings.some(
          (b) =>
            b.id !== id &&
            b.fecha === fecha &&
            b.horaInicio === horaInicio &&
            b.estado !== "cancelada"
        );
        if (conflict) return false;
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, fecha, horaInicio, horaFin } : b
          ),
        }));
        return true;
      },

      lockSlot: (params) =>
        set((s) => ({
          slotLocks: [
            ...s.slotLocks.filter((l) => l.sessionId !== params.sessionId),
            createSlotLock(params),
          ],
        })),

      releaseSlot: (slotId, sessionId) =>
        set((s) => ({
          slotLocks: s.slotLocks.filter(
            (l) => !(l.slotId === slotId && l.sessionId === sessionId)
          ),
        })),

      releaseSessionLocks: (sessionId) =>
        set((s) => ({
          slotLocks: s.slotLocks.filter((l) => l.sessionId !== sessionId),
        })),

      cleanLocks: () =>
        set((s) => ({ slotLocks: cleanExpiredLocks(s.slotLocks) })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, leida: true } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, leida: true })),
        })),

      bumpScheduleVersion: () =>
        set((s) => ({ scheduleVersion: s.scheduleVersion + 1 })),

      getAdminBySlug: (slug) => {
        const state = get();
        return state.profile.slug === slug ? state.profile : null;
      },
    }),
    { name: "agendaya-store" }
  )
);
