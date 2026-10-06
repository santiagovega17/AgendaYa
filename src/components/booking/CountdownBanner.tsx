"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const LOCK_TOTAL_MS = 15 * 60 * 1000;
const WARNING_MS = 60 * 1000;

export function CountdownBanner({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expired.current = false;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(diff);
      if (diff <= 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const safe = Math.max(remaining, 0);
  const mins = Math.floor(safe / 60000);
  const secs = Math.floor((safe % 60000) / 1000);
  const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const urgent = safe <= WARNING_MS;
  const progress = Math.min(100, (safe / LOCK_TOTAL_MS) * 100);

  return (
    <div
      className={cn(
        "sticky top-2 z-20 overflow-hidden rounded-xl border shadow-soft transition-colors duration-300",
        urgent ? "border-destructive/40 bg-danger-soft text-danger-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Timer className="size-5 shrink-0" aria-hidden="true" />
        <p className="flex-1">
          {urgent ? "Último minuto para confirmar" : "Te guardamos este horario por"}
        </p>
        <span
          role="timer"
          aria-label={`Tiempo restante ${mins} minutos ${secs} segundos`}
          className="text-lg font-semibold tabular-nums"
          data-cy="countdown-timer"
        >
          {label}
        </span>
      </div>
      <div className="h-1 bg-current/10" aria-hidden="true">
        <div className="h-full bg-current transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
      </div>
      <p className="sr-only" aria-live="assertive">
        {urgent && safe > 0 ? "Queda menos de un minuto para confirmar la reserva." : ""}
      </p>
    </div>
  );
}
