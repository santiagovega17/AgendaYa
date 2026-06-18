"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassModal, ModalActions } from "@/components/ui/GlassModal";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { MonthCalendar, getDayStatusHelper } from "@/components/admin/MonthCalendar";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useToast } from "@/components/ui/Toast";

export default function DashboardPage() {
  const profile = useAgendaStore((s) => s.profile);
  const bookings = useAgendaStore((s) => s.bookings);
  const blockedDates = useAgendaStore((s) => s.blockedDates);
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const notifications = useAgendaStore((s) => s.notifications);
  const toggleBlockedDate = useAgendaStore((s) => s.toggleBlockedDate);
  const confirmBlockDate = useAgendaStore((s) => s.confirmBlockDate);
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockModal, setBlockModal] = useState<{
    fecha: string;
    bookings: typeof bookings;
  } | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayBookings = bookings.filter(
    (b) => b.fecha === today && b.estado !== "cancelada"
  );
  const unreadNotifs = notifications.filter((n) => !n.leida);

  const blockedDateStrings = blockedDates.map((b) => b.fecha);
  const bookingDateStrings = [
    ...new Set(
      bookings.filter((b) => b.estado !== "cancelada").map((b) => b.fecha)
    ),
  ];

  const handleDayClick = (dateStr: string) => {
    const result = toggleBlockedDate(dateStr);
    if (result.action === "needs_confirm") {
      setBlockModal({ fecha: dateStr, bookings: result.bookings });
    } else if (result.action === "unblocked") {
      toast(`Día ${dateStr} desbloqueado.`, "info");
    } else if (result.action === "blocked") {
      toast(`Día ${dateStr} bloqueado.`, "success");
    }
  };

  const confirmBlock = () => {
    if (!blockModal) return;
    confirmBlockDate(blockModal.fecha);
    toast(
      `Día bloqueado. Se notificaría a ${blockModal.bookings.length} invitado(s).`,
      "info"
    );
    setBlockModal(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/60">Bienvenido, {profile.nombre}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard>
            <h2 className="mb-4 font-semibold text-white">Calendario</h2>
            <MonthCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onSelectDate={handleDayClick}
              getDayStatus={(dateStr) =>
                getDayStatusHelper(dateStr, blockedDateStrings, bookingDateStrings)
              }
            />
            <div className="mt-4 flex gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-emerald-500/30" /> Con reservas
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-500/30" /> Bloqueado
              </span>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Clock size={18} />
              Turnos de hoy
            </h2>
            {todayBookings.length === 0 ? (
              <p className="text-sm text-white/50">No hay turnos para hoy.</p>
            ) : (
              <div className="space-y-2">
                {todayBookings.map((b) => {
                  const evt = eventTypes.find((e) => e.id === b.eventTypeId);
                  return (
                    <div
                      key={b.id}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">
                          {b.horaInicio} — {evt?.nombre}
                        </span>
                        <GlassBadge status={b.estado} />
                      </div>
                      <p className="text-xs text-white/50">
                        {b.invitado.nombre} {b.invitado.apellido}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Calendar size={18} />
              Días bloqueados
            </h2>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-white/50">Ningún día bloqueado.</p>
            ) : (
              <div className="space-y-1">
                {blockedDates.map((b) => (
                  <p key={b.fecha} className="text-sm text-red-200">
                    {format(new Date(b.fecha + "T00:00:00"), "d MMM yyyy", { locale: es })}
                  </p>
                ))}
              </div>
            )}
          </GlassCard>

          {unreadNotifs.length > 0 && (
            <GlassCard>
              <h2 className="mb-3 font-semibold text-white">Alertas recientes</h2>
              {unreadNotifs.slice(0, 3).map((n) => (
                <p key={n.id} className="text-sm text-white/70">
                  {n.mensaje}
                </p>
              ))}
            </GlassCard>
          )}

          <Link href="/admin/disponibilidad">
            <GlassButton variant="secondary" className="w-full">
              Configurar disponibilidad
              <ArrowRight size={16} />
            </GlassButton>
          </Link>
        </div>
      </div>

      <GlassModal
        open={!!blockModal}
        onClose={() => setBlockModal(null)}
        title="Bloquear día con reservas"
        variant="critical"
        footer={
          <ModalActions
            onCancel={() => setBlockModal(null)}
            onConfirm={confirmBlock}
            confirmLabel="Bloquear y cancelar reservas"
            confirmVariant="danger"
          />
        }
      >
        <p className="mb-3">
          Este día tiene {blockModal?.bookings.length} reserva(s) activa(s):
        </p>
        <ul className="space-y-1 text-sm">
          {blockModal?.bookings.map((b) => (
            <li key={b.id}>
              {b.horaInicio} — {b.invitado.nombre} {b.invitado.apellido} ({b.numeroReserva})
            </li>
          ))}
        </ul>
      </GlassModal>
    </div>
  );
}
