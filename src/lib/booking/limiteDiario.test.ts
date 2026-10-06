import { describe, expect, it } from "vitest";
import { generateSlots } from "@/lib/availability/generateSlots";
import { maxActiveBookingsPerDay } from "@/lib/booking/bookings";
import type { Booking, BookingSettings, EventType, WeeklySchedule } from "@/lib/types";

// TP6 · Tarea C · Vega Gallardo, Santiago
// Requerimiento: AYA-M02-RF06 "Configuración de límite máximo de reservas por actividad"

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
const control: EventType = { ...consulta, id: "evt-control", nombre: "Control" };

// Lunes a viernes de 09:00 a 12:00: 6 turnos de 30 minutos por día.
const horario: WeeklySchedule[] = [1, 2, 3, 4, 5].map((dia) => ({
  id: `sched-${dia}`,
  diaSemana: dia,
  franjas: [{ inicio: "09:00", fin: "12:00" }],
  tipo: "permanent",
}));

const settings: BookingSettings = { intervaloMin: 0, antelacionMinHoras: 0, antelacionMaxDias: 30, limiteReservasDia: 3 };

function reserva(
  fecha: string,
  horaInicio: string,
  estado: Booking["estado"] = "confirmada",
  evento: EventType = consulta
): Booking {
  const [h, m] = horaInicio.split(":").map(Number);
  const fin = h * 60 + m + evento.duracionMin;
  return {
    id: `${evento.id}-${fecha}-${horaInicio}`,
    numeroReserva: `AYA-${fecha.slice(-2)}${horaInicio.replace(":", "")}`,
    eventTypeId: evento.id,
    fecha,
    horaInicio,
    horaFin: `${String(Math.floor(fin / 60)).padStart(2, "0")}:${String(fin % 60).padStart(2, "0")}`,
    invitado: { nombre: "Ana", apellido: "López", email: "ana.lopez@test.com", telefono: "2615551234" },
    estado,
    createdAt: "2026-10-01T10:00:00Z",
  };
}

describe("maxActiveBookingsPerDay: reservas existentes contra las que se valida un nuevo límite", () => {
  const desde = "2026-10-05";

  it("normal: devuelve la cantidad del día con más reservas activas", () => {
    const bookings = [
      reserva("2026-10-20", "09:00"),
      reserva("2026-10-20", "10:00", "pendiente"),
      reserva("2026-10-21", "09:00"),
    ];
    expect(maxActiveBookingsPerDay(bookings, desde)).toBe(2);
  });

  it("normal: cuenta por actividad, no suma reservas de distintos tipos de evento del mismo día", () => {
    const bookings = [reserva("2026-10-20", "09:00"), reserva("2026-10-20", "10:00", "confirmada", control)];
    expect(maxActiveBookingsPerDay(bookings, desde)).toBe(1);
  });

  it("borde: sin reservas devuelve 0, así que cualquier límite válido es aceptable", () => {
    expect(maxActiveBookingsPerDay([], desde)).toBe(0);
  });

  it("borde: cuenta las reservas del mismo día `desde` e ignora las del día anterior", () => {
    const bookings = [
      reserva("2026-10-04", "09:00"),
      reserva("2026-10-04", "09:30"),
      reserva("2026-10-04", "10:00"),
      reserva(desde, "09:00"),
    ];
    expect(maxActiveBookingsPerDay(bookings, desde)).toBe(1);
  });

  it("inválido: las reservas canceladas o completadas no cuentan como activas", () => {
    const bookings = [
      reserva("2026-10-20", "09:00", "cancelada"),
      reserva("2026-10-20", "09:30", "completada"),
      reserva("2026-10-20", "10:00", "cancelada"),
    ];
    expect(maxActiveBookingsPerDay(bookings, desde)).toBe(0);
  });
});

describe("generateSlots: el enlace público deja de ofrecer turnos al llegar al límite diario", () => {
  const base = {
    fecha: "2026-10-20",
    eventType: consulta,
    weeklySchedules: horario,
    blockedDates: [],
    settings,
    locks: [],
    now: new Date("2026-10-05T08:00:00"),
  };

  it("borde: con una reserva menos que el límite se siguen ofreciendo los turnos libres", () => {
    const slots = generateSlots({ ...base, bookings: [reserva("2026-10-20", "09:00"), reserva("2026-10-20", "09:30")] });
    expect(slots).toHaveLength(6);
    expect(slots.filter((s) => s.disponible).map((s) => s.horaInicio)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("borde: al alcanzar exactamente el límite el día no ofrece ningún turno", () => {
    const bookings = [reserva("2026-10-20", "09:00"), reserva("2026-10-20", "09:30"), reserva("2026-10-20", "10:00")];
    expect(generateSlots({ ...base, bookings })).toEqual([]);
  });

  it("normal: las reservas canceladas y las de otra actividad no consumen el límite", () => {
    const bookings = [
      reserva("2026-10-20", "09:00"),
      reserva("2026-10-20", "09:30", "cancelada"),
      reserva("2026-10-20", "10:00", "cancelada"),
      reserva("2026-10-20", "10:30", "confirmada", control),
      reserva("2026-10-20", "11:00", "confirmada", control),
    ];
    // Solo hay 1 reserva activa de "Consulta general": el día sigue abierto. Que los turnos de "Control"
    // se superpongan lo resuelve markOverlappingSlots, no el límite diario.
    const slots = generateSlots({ ...base, bookings });
    expect(slots).toHaveLength(6);
    expect(slots.find((s) => s.horaInicio === "09:00")?.disponible).toBe(false);
  });

  it("inválido: un límite 0 (que el formulario rechaza) cierra el día en lugar de permitir reservas sin tope", () => {
    const slots = generateSlots({ ...base, settings: { ...settings, limiteReservasDia: 0 }, bookings: [] });
    expect(slots).toEqual([]);
  });
});
