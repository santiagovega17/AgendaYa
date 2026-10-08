import { describe, expect, it } from "vitest";
import { buildIcs, utcStamp } from "@/lib/ics";

/**
 * INC-0417 · M04. La confirmación de calendario salía en hora flotante, sin la zona
 * del administrador. Un celular en un huso una hora distinto (por ejemplo La Paz, UTC−4,
 * contra Buenos Aires, UTC−3) mostraba el turno corrido una hora.
 */
const TURNO = {
  uid: "AYA-1042",
  titulo: "Consulta general con Dra. Laura Pérez",
  descripcion: "Reserva AYA-1042",
  fecha: "2026-10-19",
  horaInicio: "10:00",
  horaFin: "10:30",
  timezone: "America/Argentina/Buenos_Aires",
};

describe("confirmación de calendario en la zona del administrador", () => {
  it("convierte las 10:00 de Buenos Aires a las 13:00 UTC", () => {
    expect(utcStamp("2026-10-19", "10:00", "America/Argentina/Buenos_Aires")).toBe("20261019T130000Z");
    expect(utcStamp("2026-10-19", "10:30", "America/Argentina/Buenos_Aires")).toBe("20261019T133000Z");
  });

  it("no deja el horario flotante: un invitado una hora al oeste no lo ve desplazado", () => {
    const ics = buildIcs(TURNO);

    expect(ics).toContain("DTSTART:20261019T130000Z");
    expect(ics).toContain("DTEND:20261019T133000Z");
    // Antes del fix el archivo decía DTSTART:20261019T100000, sin Z.
    expect(ics).not.toContain("DTSTART:20261019T100000");
    expect(ics).not.toContain("DTEND:20261019T103000");
  });

  it("usa la zona que tenga el administrador, no una fija", () => {
    const ics = buildIcs({ ...TURNO, timezone: "America/La_Paz" });
    // 10:00 en La Paz son las 14:00 UTC, una hora más que en Buenos Aires.
    expect(ics).toContain("DTSTART:20261019T140000Z");
  });
});
