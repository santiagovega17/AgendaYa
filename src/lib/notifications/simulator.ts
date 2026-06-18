import type { NotificationType } from "@/lib/types";

export function createNotification(
  tipo: NotificationType,
  destinatario: string,
  mensaje: string
) {
  return {
    id: crypto.randomUUID(),
    tipo,
    destinatario,
    mensaje,
    leida: false,
    createdAt: new Date().toISOString(),
  };
}
