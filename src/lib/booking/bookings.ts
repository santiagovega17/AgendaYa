import type { Booking } from "@/lib/types";

export const isActive = (b: Booking) => b.estado === "pendiente" || b.estado === "confirmada";

/** Reservas pendientes o confirmadas de una fecha: las que impiden bloquearla sin confirmación (AYA-M02-RF03). */
export const activeBookingsOn = (bookings: Booking[], fecha: string) =>
  bookings.filter((b) => b.fecha === fecha && isActive(b));

/** Mayor cantidad de reservas activas de una misma actividad en un mismo día, desde `desde` en adelante (AYA-M02-RF06). */
export function maxActiveBookingsPerDay(bookings: Booking[], desde: string) {
  const perDay = new Map<string, number>();
  for (const b of bookings) {
    if (b.fecha < desde || !isActive(b)) continue;
    const key = `${b.fecha}|${b.eventTypeId}`;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...perDay.values());
}
