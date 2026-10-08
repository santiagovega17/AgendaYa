const escape = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/**
 * Hora de pared, sin zona. Un celular en otro huso la interpreta como hora local
 * y el turno aparece corrido. INC-0417.
 */
export function utcStamp(fecha: string, hora: string, _timezone: string) {
  return `${fecha.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

export function buildIcs(params: {
  uid: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
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

/** Descarga un .ics. La hora sigue flotante: no se ancla a la zona del administrador. */
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
