"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, ChevronLeft, Clock, MapPin, Video } from "lucide-react";
import { z } from "zod";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassTextarea } from "@/components/ui/GlassTextarea";
import { GlassModal } from "@/components/ui/GlassModal";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { useAgendaStore } from "@/store/useAgendaStore";
import { generateSlots, getAvailableDates } from "@/lib/availability/generateSlots";
import { getSessionId, ABANDON_RELEASE_MS } from "@/lib/booking/locks";
import type { Booking, EventType, Slot } from "@/lib/types";

const guestSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido"),
  telefono: z.string().min(6, "Teléfono requerido"),
  nota: z.string().max(200).optional(),
});

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const profile = useAgendaStore((s) => s.profile);
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const weeklySchedules = useAgendaStore((s) => s.weeklySchedules);
  const blockedDates = useAgendaStore((s) => s.blockedDates);
  const settings = useAgendaStore((s) => s.settings);
  const bookings = useAgendaStore((s) => s.bookings);
  const slotLocks = useAgendaStore((s) => s.slotLocks);
  const scheduleVersion = useAgendaStore((s) => s.scheduleVersion);
  const lockSlot = useAgendaStore((s) => s.lockSlot);
  const releaseSessionLocks = useAgendaStore((s) => s.releaseSessionLocks);
  const cleanLocks = useAgendaStore((s) => s.cleanLocks);
  const createBooking = useAgendaStore((s) => s.createBooking);

  const [step, setStep] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", nota: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scheduleChangedModal, setScheduleChangedModal] = useState(false);
  const [slotTakenModal, setSlotTakenModal] = useState(false);
  const [noEventsModal, setNoEventsModal] = useState(false);

  const sessionId = useRef(getSessionId());
  const prevScheduleVersion = useRef(scheduleVersion);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValidAdmin = profile.slug === slug;
  const activeEvents = eventTypes.filter((e) => e.activo);

  const refreshSlots = useCallback(() => {
    if (!selectedEvent || !selectedDate) return;
    cleanLocks();
    const newSlots = generateSlots({
      fecha: selectedDate,
      eventType: selectedEvent,
      weeklySchedules,
      blockedDates,
      bookings,
      settings,
      locks: useAgendaStore.getState().slotLocks,
      sessionId: sessionId.current,
    });
    setSlots(newSlots);
  }, [
    selectedEvent,
    selectedDate,
    weeklySchedules,
    blockedDates,
    bookings,
    settings,
    cleanLocks,
  ]);

  useEffect(() => {
    if (activeEvents.length === 0 && isValidAdmin) {
      setNoEventsModal(true);
    }
  }, [activeEvents.length, isValidAdmin]);

  useEffect(() => {
    if (step === 1 && selectedEvent) {
      refreshSlots();
      const interval = setInterval(refreshSlots, 30_000);
      return () => clearInterval(interval);
    }
  }, [step, selectedEvent, selectedDate, refreshSlots]);

  useEffect(() => {
    if (scheduleVersion !== prevScheduleVersion.current && step >= 1) {
      setScheduleChangedModal(true);
      prevScheduleVersion.current = scheduleVersion;
    }
  }, [scheduleVersion, step]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      releaseSessionLocks(sessionId.current);
    };
    const handleVisibility = () => {
      if (document.hidden) {
        abandonTimer.current = setTimeout(() => {
          releaseSessionLocks(sessionId.current);
        }, ABANDON_RELEASE_MS);
      } else if (abandonTimer.current) {
        clearTimeout(abandonTimer.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseSessionLocks(sessionId.current);
    };
  }, [releaseSessionLocks]);

  if (!isValidAdmin) {
    return (
      <GlassCard className="mt-12 text-center">
        <h1 className="text-xl font-bold text-white">Agenda no encontrada</h1>
        <p className="mt-2 text-white/60">El enlace que ingresaste no existe.</p>
      </GlassCard>
    );
  }

  const selectEvent = (evt: EventType) => {
    setSelectedEvent(evt);
    setStep(1);
    setSelectedDate("");
    setSelectedSlot(null);
  };

  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    if (selectedEvent) {
      const newSlots = generateSlots({
        fecha: dateStr,
        eventType: selectedEvent,
        weeklySchedules,
        blockedDates,
        bookings,
        settings,
        locks: slotLocks,
        sessionId: sessionId.current,
      });
      setSlots(newSlots);
    }
  };

  const selectSlot = (slot: Slot) => {
    if (!slot.disponible || !selectedEvent) return;
    lockSlot({
      slotId: slot.id,
      eventTypeId: selectedEvent.id,
      fecha: slot.fecha,
      horaInicio: slot.horaInicio,
      sessionId: sessionId.current,
    });
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    setLockExpiresAt(expires);
    setSelectedSlot(slot);
    setStep(2);
  };

  const submitForm = () => {
    const result = guestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!selectedEvent || !selectedSlot) return;

    const booking = createBooking({
      eventTypeId: selectedEvent.id,
      fecha: selectedSlot.fecha,
      horaInicio: selectedSlot.horaInicio,
      horaFin: selectedSlot.horaFin,
      invitado: result.data,
      autoConfirm: selectedEvent.confirmacionAuto,
    });

    if (!booking) {
      setSlotTakenModal(true);
      setStep(1);
      setSelectedSlot(null);
      refreshSlots();
      return;
    }

    setConfirmedBooking(booking);
    setStep(3);
    releaseSessionLocks(sessionId.current);
  };

  const availableDates = selectedEvent
    ? getAvailableDates({
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth(),
        eventType: selectedEvent,
        weeklySchedules,
        blockedDates,
        bookings,
        settings,
        locks: slotLocks,
        sessionId: sessionId.current,
      })
    : [];

  const modalityIcon = (mod: string) => {
    if (mod === "virtual") return <Video size={14} />;
    return <MapPin size={14} />;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        {profile.foto && (
          <img
            src={profile.foto}
            alt={profile.nombre}
            className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-white/20"
          />
        )}
        <h1 className="text-xl font-bold text-white">{profile.nombre}</h1>
        <p className="text-sm text-white/60">Reservá tu turno</p>
      </div>

      <StepIndicator current={step} />

      {step === 0 && (
        <div className="space-y-3">
          {activeEvents.map((evt) => (
            <button
              key={evt.id}
              onClick={() => selectEvent(evt)}
              className="w-full rounded-2xl border border-white/20 bg-white/10 p-4 text-left backdrop-blur-xl transition-colors hover:bg-white/15"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{evt.nombre}</h3>
                <span className="flex items-center gap-1 text-xs text-white/50">
                  {modalityIcon(evt.modalidad)}
                  {evt.duracionMin} min
                </span>
              </div>
              <p className="mt-1 text-sm text-white/60">{evt.descripcion}</p>
            </button>
          ))}
        </div>
      )}

      {step === 1 && selectedEvent && (
        <div className="space-y-4">
          <GlassButton variant="ghost" size="sm" onClick={() => setStep(0)}>
            <ChevronLeft size={16} />
            Volver
          </GlassButton>

          <GlassCard padding="sm">
            <p className="mb-2 text-sm text-white/60">
              {selectedEvent.nombre} · {selectedEvent.duracionMin} min
            </p>
            <MonthCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDate={selectedDate}
              onSelectDate={selectDate}
              disabledDates={[]}
              getDayStatus={(dateStr) =>
                availableDates.includes(dateStr) ? "available" : "empty"
              }
            />
          </GlassCard>

          {selectedDate && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/80">
                Horarios —{" "}
                {format(parse(selectedDate, "yyyy-MM-dd", new Date()), "d MMMM", {
                  locale: es,
                })}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    disabled={!slot.disponible}
                    onClick={() => selectSlot(slot)}
                    className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                      slot.disponible
                        ? "border-white/20 bg-white/10 text-white hover:bg-indigo-500/30"
                        : "cursor-not-allowed border-white/5 bg-white/5 text-white/30"
                    }`}
                  >
                    <Clock size={12} className="mx-auto mb-1 opacity-50" />
                    {slot.horaInicio}
                  </button>
                ))}
              </div>
              {slots.length === 0 && (
                <p className="text-center text-sm text-white/50">
                  No hay horarios disponibles este día.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedSlot && (
        <div className="space-y-4">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => {
              releaseSessionLocks(sessionId.current);
              setStep(1);
              setSelectedSlot(null);
              setLockExpiresAt(null);
            }}
          >
            <ChevronLeft size={16} />
            Volver
          </GlassButton>

          {lockExpiresAt && <CountdownTimer expiresAt={lockExpiresAt} />}

          <GlassCard className="space-y-4">
            <p className="text-sm text-white/60">
              {selectedEvent?.nombre} · {selectedSlot.fecha} · {selectedSlot.horaInicio}
            </p>
            <GlassInput
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              error={errors.nombre}
            />
            <GlassInput
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              error={errors.apellido}
            />
            <GlassInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <GlassInput
              label="Teléfono"
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              error={errors.telefono}
            />
            <GlassTextarea
              label="Nota (opcional)"
              value={form.nota}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
              showCount
              maxLength={200}
            />
            <GlassButton className="w-full" size="lg" onClick={submitForm}>
              Confirmar reserva
            </GlassButton>
          </GlassCard>
        </div>
      )}

      {step === 3 && confirmedBooking && (
        <GlassCard className="text-center">
          <CheckCircle className="mx-auto mb-4 text-emerald-400" size={48} />
          <h2 className="text-xl font-bold text-white">¡Reserva confirmada!</h2>
          <p className="mt-2 text-white/60">
            Número de reserva: <strong className="text-white">{confirmedBooking.numeroReserva}</strong>
          </p>
          <div className="mt-4 space-y-1 text-sm text-white/70">
            <p>{selectedEvent?.nombre}</p>
            <p>
              {confirmedBooking.fecha} a las {confirmedBooking.horaInicio}
            </p>
            <p>
              {confirmedBooking.invitado.nombre} {confirmedBooking.invitado.apellido}
            </p>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Recibirás un email de confirmación (simulado en este prototipo).
          </p>
        </GlassCard>
      )}

      <GlassModal
        open={noEventsModal}
        onClose={() => setNoEventsModal(false)}
        title="Sin eventos disponibles"
      >
        <p>
          El administrador no tiene eventos activos. Contactá a{" "}
          <strong>{profile.email}</strong> para más información.
        </p>
      </GlassModal>

      <GlassModal
        open={slotTakenModal}
        onClose={() => setSlotTakenModal(false)}
        title="Horario no disponible"
      >
        <p>Este horario ya fue reservado. Por favor elegí otro.</p>
      </GlassModal>

      <GlassModal
        open={scheduleChangedModal}
        onClose={() => {
          setScheduleChangedModal(false);
          refreshSlots();
        }}
        title="Horarios actualizados"
      >
        <p>El administrador cambió sus horarios. La disponibilidad se actualizó automáticamente.</p>
      </GlassModal>
    </div>
  );
}
