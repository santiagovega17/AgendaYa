import { fromZonedTime } from "date-fns-tz";

const escape = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Instante UTC de una hora de pared en la zona del administrador (`20261019T130000Z`). */
export function utcStamp(fecha: string, hora: string, timezone: string) {
  const utc = fromZonedTime(`${fecha}T${hora}:00`, timezone);
  return utc
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function buildIcs(params: {
  uid: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  /** Zona del administrador. El invitado puede estar en otra. */
  timezone: string;
}) {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgendaYa//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@agendaya`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${utcStamp(params.fecha, params.horaInicio, params.timezone)}`,
    `DTEND:${utcStamp(params.fecha, params.horaFin, params.timezone)}`,
    `SUMMARY:${escape(params.titulo)}`,
    `DESCRIPTION:${escape(params.descripcion)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return body;
}

/** Descarga un .ics con el turno anclado a la zona del administrador. */
export function downloadIcs(params: {
  uid: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  timezone: string;
}) {
  const url = URL.createObjectURL(new Blob([buildIcs(params)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reserva-${params.uid}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
