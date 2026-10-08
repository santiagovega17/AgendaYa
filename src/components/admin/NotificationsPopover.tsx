"use client";

import Link from "next/link";
import { Bell, BellOff, CalendarCheck, CalendarClock, CalendarX, Hourglass, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { formatHace } from "@/lib/format";
import type { NotificationType } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

const ICONS: Record<NotificationType, typeof Bell> = {
  reserva_confirmada: CalendarCheck,
  reserva_pendiente: Hourglass,
  reserva_cancelada: CalendarX,
  reserva_reagendada: CalendarClock,
  recordatorio: Bell,
  bloqueo_dia: Lock,
};

export function NotificationsPopover() {
  const notifications = useAgendaStore((s) => s.notifications);
  const markAllNotificationsRead = useAgendaStore((s) => s.markAllNotificationsRead);
  const unread = notifications.filter((n) => !n.leida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-semibold leading-4 text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notificaciones</p>
          {unread > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => markAllNotificationsRead()}>
              Marcar todas como leídas
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <BellOff className="size-6" aria-hidden="true" />
            No tenés notificaciones.
          </div>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {notifications.slice(0, 10).map((n) => {
              const Icon = ICONS[n.tipo] ?? Bell;
              return (
                <li key={n.id} className={cn("flex gap-3 px-4 py-3", !n.leida && "bg-accent/60")}>
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.leida && "font-medium")}>{n.mensaje}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatHace(n.createdAt)}</p>
                  </div>
                  {!n.leida && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/admin/agenda">Ver agenda</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
