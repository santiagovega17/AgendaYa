import { cn } from "@/lib/utils/cn";
import type { BookingStatus } from "@/lib/types";

const statusStyles: Record<BookingStatus, string> = {
  pendiente: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  confirmada: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  completada: "bg-blue-500/20 text-blue-200 border-blue-400/30",
  cancelada: "bg-red-500/20 text-red-200 border-red-400/30",
};

const statusLabels: Record<BookingStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export function GlassBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
