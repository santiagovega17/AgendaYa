import { CheckCircle2, CircleCheckBig, Hourglass, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/types";

const CONFIG: Record<
  BookingStatus,
  { label: string; variant: "success" | "warning" | "info" | "muted"; icon: typeof Hourglass }
> = {
  pendiente: { label: "Pendiente", variant: "warning", icon: Hourglass },
  confirmada: { label: "Confirmada", variant: "success", icon: CheckCircle2 },
  completada: { label: "Completada", variant: "info", icon: CircleCheckBig },
  cancelada: { label: "Cancelada", variant: "muted", icon: XCircle },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant} className="gap-1 px-2.5 py-1 text-xs">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
