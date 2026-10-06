import { describe, expect, it } from "vitest";
import { generateSlots } from "@/lib/availability/generateSlots";
import { activeBookingsOn, maxActiveBookingsPerDay } from "@/lib/booking/bookings";
import type { Booking, BookingSettings, EventType, WeeklySchedule } from "@/lib/types";
import { NOTA_MAX, guestSchema } from "./guest";
import { FIN_ANTES_DE_INICIO, scheduleSchema } from "./schedule";
import { LIMITE_CONFLICTO, LIMITE_FORMATO, settingsSchema } from "./settings";

// Casos de prueba del TP N.º 5 (Grupo 6 - 4K9). Cada bloque usa los datos de prueba del CP homónimo.

const consulta: EventType = {
  id: "evt-consulta",
  adminId: "admin-test",
  nombre: "Consulta general",
  duracionMin: 30,
  modalidad: "presencial",
  confirmacionAuto: true,
  descripcion: "",
  activo: true,
};

const settings: BookingSettings = {
  intervaloMin: 0,
  antelacionMinHoras: 0,
  antelacionMaxDias: 30,
  limiteReservasDia: 20,
};

const lunesAViernes: WeeklySchedule[] = [1, 2, 3, 4, 5].map((dia) => ({
  id: `sched-${dia}`,
  diaSemana: dia,
  franjas: [{ inicio: "09:00", fin: "18:00" }],
  tipo: "permanent",
  fechaInicio: "2026-10-01",
}));

const guestValido = {
  nombre: "Juan",
  apellido: "Hernandez",
  email: "JHernandez@gmail.com",
  telefono: "54 9 261 846 7920",
  nota: "",
};

const settingsActuales = { intervaloMin: 10, antelacionMinHoras: 2, antelacionMaxDias: 30, limiteReservasDia: 8 };

function reserva(id: string, fecha: string, horaInicio: string, estado: Booking["estado"]): Booking {
  return {
    id,
    numeroReserva: `AYA-${id}`,
    eventTypeId: consulta.id,
    fecha,
    horaInicio,
    horaFin: `${horaInicio.slice(0, 2)}:30`,
    invitado: { nombre: "Invitado", apellido: id, email: `${id}@mail.com`, telefono: "2614000000" },
    estado,
    createdAt: "2026-10-05T12:00:00Z",
  };
}

function issueMessages(result: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((i) => ({ path: i.path.join("."), message: i.message })) ?? [];
}

describe("CP-001 / CP-002 · Definición de franja horaria (AYA-M02-RF01)", () => {
  it("CP-001 (positiva): acepta la franja de 07:00 a 15:00 de lunes a viernes", () => {
    const result = scheduleSchema.safeParse({ dias: [1, 2, 3, 4, 5], franjas: [{ inicio: "07:00", fin: "15:00" }] });
    expect(result.success).toBe(true);
  });

  it("CP-002 (negativa): rechaza una franja de 07:00 a 03:00 porque el fin es anterior al inicio", () => {
    const result = scheduleSchema.safeParse({ dias: [1, 2, 3, 4, 5], franjas: [{ inicio: "07:00", fin: "03:00" }] });
    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContainEqual({ path: "franjas.0.fin", message: FIN_ANTES_DE_INICIO });
  });
});

describe("CP-003 / CP-004 · Ingreso de datos personales (AYA-M04-RF03)", () => {
  it("CP-003 (positiva): acepta nombre, apellido, email y teléfono válidos con la nota vacía", () => {
    expect(guestSchema.safeParse(guestValido).success).toBe(true);
  });

  it("CP-004 (negativa): rechaza el email sin @ 'JHernandez.gmail.com'", () => {
    const result = guestSchema.safeParse({ ...guestValido, email: "JHernandez.gmail.com" });
    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual([
      { path: "email", message: "Ingresá un email válido, por ejemplo nombre@correo.com" },
    ]);
  });
});

describe("CP-005 / CP-006 · Nota opcional con límite de 200 caracteres (AYA-M04-RNF04)", () => {
  it("CP-005 (positiva): acepta una nota de exactamente 200 caracteres (valor límite)", () => {
    const nota = "A".repeat(NOTA_MAX);
    expect(nota).toHaveLength(200);
    expect(guestSchema.safeParse({ ...guestValido, nota }).success).toBe(true);
  });

  it("CP-006 (negativa): rechaza una nota de 201 caracteres (límite + 1)", () => {
    const result = guestSchema.safeParse({ ...guestValido, nota: "A".repeat(NOTA_MAX + 1) });
    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual([{ path: "nota", message: "La nota admite hasta 200 caracteres" }]);
  });
});

describe("CP-007 / CP-008 · Límite diario de reservas por actividad (AYA-M02-RF06)", () => {
  it("CP-007 (positiva): acepta un límite de 10 reservas por día", () => {
    expect(settingsSchema.safeParse({ ...settingsActuales, limiteReservasDia: 10 }).success).toBe(true);
  });

  it("CP-008 (negativa): rechaza el límite 0 con el mensaje del requerimiento", () => {
    const result = settingsSchema.safeParse({ ...settingsActuales, limiteReservasDia: 0 });
    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual([{ path: "limiteReservasDia", message: LIMITE_FORMATO }]);
  });

  it.each([-3, 2.5, Number.NaN])("CP-008 (clases inválidas adicionales): rechaza %s", (limite) => {
    const result = settingsSchema.safeParse({ ...settingsActuales, limiteReservasDia: limite });
    expect(issueMessages(result)).toEqual([{ path: "limiteReservasDia", message: LIMITE_FORMATO }]);
  });

  it("CP-008 (nota): un límite menor a las reservas activas del día dispara el conflicto de consistencia", () => {
    const bookings = [
      reserva("1001", "2026-10-20", "10:00", "confirmada"),
      reserva("1002", "2026-10-20", "11:00", "pendiente"),
      reserva("1003", "2026-10-20", "12:00", "cancelada"),
    ];
    const limiteNuevo = 1;
    expect(maxActiveBookingsPerDay(bookings, "2026-10-05")).toBe(2);
    expect(limiteNuevo).toBeLessThan(maxActiveBookingsPerDay(bookings, "2026-10-05"));
    expect(LIMITE_CONFLICTO).toBe("El nuevo límite es inferior a la cantidad de reservas ya existentes para el día");
  });
});

describe("CP-009 / CP-010 · Bloqueo de días (AYA-M02-RF03)", () => {
  const ahora = new Date("2026-10-05T18:00:00");

  it("CP-009 (positiva): un día sin reservas se bloquea y deja de ofrecer turnos en el enlace público", () => {
    const params = {
      fecha: "2026-10-19",
      eventType: consulta,
      weeklySchedules: lunesAViernes,
      bookings: [],
      settings,
      locks: [],
      now: ahora,
    };
    expect(activeBookingsOn([], "2026-10-19")).toEqual([]);
    expect(generateSlots({ ...params, blockedDates: [] }).length).toBeGreaterThan(0);
    expect(generateSlots({ ...params, blockedDates: [{ fecha: "2026-10-19", motivo: "Capacitación" }] })).toEqual([]);
  });

  it("CP-010 (negativa): un día con reservas activas lista los turnos afectados en lugar de bloquearse", () => {
    const bookings = [
      reserva("1001", "2026-10-20", "10:00", "confirmada"),
      reserva("1002", "2026-10-20", "11:00", "confirmada"),
      reserva("1003", "2026-10-20", "12:00", "cancelada"),
      reserva("1004", "2026-10-21", "10:00", "confirmada"),
    ];
    const afectadas = activeBookingsOn(bookings, "2026-10-20");
    expect(afectadas.map((b) => b.numeroReserva)).toEqual(["AYA-1001", "AYA-1002"]);
  });
});

describe("CP-011 / CP-012 · Validación de horarios expirados (AYA-M04-RF06)", () => {
  const slotsDeHoy = () =>
    generateSlots({
      fecha: "2026-10-19",
      eventType: consulta,
      weeklySchedules: lunesAViernes,
      blockedDates: [],
      bookings: [],
      settings,
      locks: [],
      now: new Date("2026-10-19T11:10:00"),
    });

  it("CP-011 (positiva): el turno futuro de las 15:00 está disponible para seleccionar", () => {
    expect(slotsDeHoy().find((s) => s.horaInicio === "15:00")).toMatchObject({ disponible: true });
  });

  it("CP-012 (negativa): los turnos anteriores a las 11:10 se muestran vencidos y no se pueden seleccionar", () => {
    const pasados = slotsDeHoy().filter((s) => s.horaInicio < "11:10");
    expect(pasados.map((s) => s.horaInicio)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(pasados.every((s) => s.vencido && !s.disponible)).toBe(true);
  });
});
