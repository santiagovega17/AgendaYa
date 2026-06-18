"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, List, Check, X, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { GlassModal, ModalActions } from "@/components/ui/GlassModal";
import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useToast } from "@/components/ui/Toast";
import { generateSlots } from "@/lib/availability/generateSlots";
import type { Booking } from "@/lib/types";

export default function AgendaPage() {
  const bookings = useAgendaStore((s) => s.bookings);
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const weeklySchedules = useAgendaStore((s) => s.weeklySchedules);
  const blockedDates = useAgendaStore((s) => s.blockedDates);
  const settings = useAgendaStore((s) => s.settings);
  const slotLocks = useAgendaStore((s) => s.slotLocks);
  const cancelBooking = useAgendaStore((s) => s.cancelBooking);
  const completeBooking = useAgendaStore((s) => s.completeBooking);
  const rescheduleBooking = useAgendaStore((s) => s.rescheduleBooking);
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "calendar">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [newSlot, setNewSlot] = useState({ fecha: "", horaInicio: "", horaFin: "" });
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    if (filterStatus === "all") return true;
    return b.estado === filterStatus;
  });

  const bookingDates = filtered
    .filter((b) => b.estado !== "cancelada")
    .map((b) => b.fecha);

  const openReschedule = (booking: Booking) => {
    setRescheduleTarget(booking);
    setNewSlot({ fecha: booking.fecha, horaInicio: booking.horaInicio, horaFin: booking.horaFin });
  };

  const getSlotsForReschedule = () => {
    if (!rescheduleTarget || !newSlot.fecha) return [];
    const evt = eventTypes.find((e) => e.id === rescheduleTarget.eventTypeId);
    if (!evt) return [];
    return generateSlots({
      fecha: newSlot.fecha,
      eventType: evt,
      weeklySchedules,
      blockedDates,
      bookings: bookings.filter((b) => b.id !== rescheduleTarget.id),
      settings,
      locks: slotLocks,
    }).filter((s) => s.disponible);
  };

  const confirmReschedule = () => {
    if (!rescheduleTarget) return;
    const ok = rescheduleBooking(
      rescheduleTarget.id,
      newSlot.fecha,
      newSlot.horaInicio,
      newSlot.horaFin
    );
    if (ok) {
      toast("Reserva reagendada.", "success");
      setRescheduleTarget(null);
    } else {
      toast("El horario seleccionado no está disponible.", "error");
    }
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelBooking(cancelTarget);
    toast("Reserva cancelada. Se notificó al invitado.", "info");
    setCancelTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Agenda y reservas</h1>
        <div className="flex gap-2">
          <GlassButton
            variant={view === "list" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List size={16} />
            Lista
          </GlassButton>
          <GlassButton
            variant={view === "calendar" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            <Calendar size={16} />
            Calendario
          </GlassButton>
        </div>
      </div>

      {view === "list" ? (
        <GlassCard>
          <div className="mb-4">
            <GlassSelect
              label="Filtrar por estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "all", label: "Todos" },
                { value: "pendiente", label: "Pendiente" },
                { value: "confirmada", label: "Confirmada" },
                { value: "completada", label: "Completada" },
                { value: "cancelada", label: "Cancelada" },
              ]}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="pb-3 pr-4">Nº</th>
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Hora</th>
                  <th className="pb-3 pr-4">Evento</th>
                  <th className="pb-3 pr-4">Invitado</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const evt = eventTypes.find((e) => e.id === b.eventTypeId);
                  return (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-white/80">{b.numeroReserva}</td>
                      <td className="py-3 pr-4 text-white/80">
                        {format(parse(b.fecha, "yyyy-MM-dd", new Date()), "d MMM yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td className="py-3 pr-4 text-white/80">{b.horaInicio}</td>
                      <td className="py-3 pr-4 text-white/80">{evt?.nombre}</td>
                      <td className="py-3 pr-4 text-white/80">
                        {b.invitado.nombre} {b.invitado.apellido}
                      </td>
                      <td className="py-3 pr-4">
                        <GlassBadge status={b.estado} />
                      </td>
                      <td className="py-3">
                        {b.estado !== "cancelada" && b.estado !== "completada" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openReschedule(b)}
                              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                              title="Reagendar"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => completeBooking(b.id)}
                              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-emerald-400"
                              title="Completar"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setCancelTarget(b.id)}
                              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-red-400"
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-white/50">No hay reservas.</p>
            )}
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <MonthCalendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            getDayStatus={(dateStr) =>
              bookingDates.includes(dateStr) ? "has-bookings" : "available"
            }
          />
          <div className="mt-4 space-y-2">
            {filtered
              .filter((b) => b.estado !== "cancelada")
              .map((b) => {
                const evt = eventTypes.find((e) => e.id === b.eventTypeId);
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2"
                  >
                    <div>
                      <span className="text-sm text-white">
                        {b.fecha} {b.horaInicio} — {evt?.nombre}
                      </span>
                      <p className="text-xs text-white/50">
                        {b.invitado.nombre} {b.invitado.apellido}
                      </p>
                    </div>
                    <GlassBadge status={b.estado} />
                  </div>
                );
              })}
          </div>
        </GlassCard>
      )}

      <GlassModal
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reagendar reserva"
        footer={
          <ModalActions
            onCancel={() => setRescheduleTarget(null)}
            onConfirm={confirmReschedule}
            confirmLabel="Reagendar"
          />
        }
      >
        <div className="space-y-4">
          <GlassSelect
            label="Fecha"
            value={newSlot.fecha}
            onChange={(e) => setNewSlot({ ...newSlot, fecha: e.target.value })}
            options={[
              { value: "", label: "Seleccionar..." },
              ...getSlotsForReschedule().reduce<{ value: string; label: string }[]>(
                (acc, s) => {
                  if (!acc.find((a) => a.value === s.fecha)) {
                    acc.push({ value: s.fecha, label: s.fecha });
                  }
                  return acc;
                },
                []
              ),
            ]}
          />
          <GlassSelect
            label="Horario"
            value={newSlot.horaInicio}
            onChange={(e) => {
              const slot = getSlotsForReschedule().find((s) => s.horaInicio === e.target.value);
              if (slot) {
                setNewSlot({
                  fecha: slot.fecha,
                  horaInicio: slot.horaInicio,
                  horaFin: slot.horaFin,
                });
              }
            }}
            options={[
              { value: "", label: "Seleccionar..." },
              ...getSlotsForReschedule()
                .filter((s) => s.fecha === newSlot.fecha)
                .map((s) => ({ value: s.horaInicio, label: s.horaInicio })),
            ]}
          />
        </div>
      </GlassModal>

      <GlassModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar reserva"
        variant="critical"
        footer={
          <ModalActions
            onCancel={() => setCancelTarget(null)}
            onConfirm={confirmCancel}
            confirmLabel="Cancelar reserva"
            confirmVariant="danger"
          />
        }
      >
        <p>¿Confirmás la cancelación? Se notificará al invitado.</p>
      </GlassModal>
    </div>
  );
}
