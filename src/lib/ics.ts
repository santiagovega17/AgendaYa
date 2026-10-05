const stamp = (fecha: string, hora: string) => `${fecha.replace(/-/g, "")}T${hora.replace(":", "")}00`;

const escape = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Descarga un archivo .ics con el turno en hora local (sin zona horaria). */
export function downloadIcs(params: {
  uid: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}) {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgendaYa//Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${params.uid}@agendaya`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${stamp(params.fecha, params.horaInicio)}`,
    `DTEND:${stamp(params.fecha, params.horaFin)}`,
    `SUMMARY:${escape(params.titulo)}`,
    `DESCRIPTION:${escape(params.descripcion)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reserva-${params.uid}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
