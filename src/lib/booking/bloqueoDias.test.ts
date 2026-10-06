import { describe, expect, it } from "vitest";
import { generateSlots, getAvailableDates } from "@/lib/availability/generateSlots";
import { activeBookingsOn } from "@/lib/booking/bookings";
import type { BlockedDate, Booking, BookingSettings, EventType, WeeklySchedule } from "@/lib/types";

// TP6 · Tarea C · Rosales Pedroza, Nicolás
// Requerimiento: AYA-M02-RF03 "Bloqueo de días"

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

const settings: BookingSettings = { intervaloMin: 0, antelacionMinHoras: 0, antelacionMaxDias: 60, limiteReservasDia: 10 };

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

describe("activeBookingsOn: reservas que impiden bloquear un día sin confirmación", () => {
  const fecha = "2026-10-20";

  it("normal: devuelve solo las reservas pendientes y confirmadas de la fecha a bloquear", () => {
    const bookings = [
      reserva(fecha, "09:00", "confirmada"),
      reserva(fecha, "09:30", "pendiente"),
      reserva(fecha, "10:00", "cancelada"),
      reserva("2026-10-21", "09:00", "confirmada"),
    ];
    const afectadas = activeBookingsOn(bookings, fecha);
    expect(afectadas.map((b) => b.horaInicio)).toEqual(["09:00", "09:30"]);
    expect(afectadas.every((b) => b.fecha === fecha)).toBe(true);
  });

  it("normal: el bloqueo es de todo el día, así que lista las reservas de cualquier tipo de evento", () => {
    const bookings = [reserva(fecha, "09:00"), reserva(fecha, "10:00", "pendiente", control)];
    expect(activeBookingsOn(bookings, fecha).map((b) => b.eventTypeId)).toEqual(["evt-consulta", "evt-control"]);
  });

  it("borde: sin reservas devuelve una lista vacía, así que el día se puede bloquear directamente", () => {
    expect(activeBookingsOn([], fecha)).toEqual([]);
  });

  it("borde: las reservas canceladas o completadas del día no impiden el bloqueo", () => {
    const bookings = [reserva(fecha, "09:00", "cancelada"), reserva(fecha, "09:30", "completada")];
    expect(activeBookingsOn(bookings, fecha)).toEqual([]);
  });

  // Documenta una limitación: la función no valida el formato. En la app la fecha siempre sale del
  // calendario como YYYY-MM-DD; si llegara en otro formato, el día se bloquearía sin avisar de sus reservas.
  it("inválido: con una fecha en otro formato no encuentra reservas (no valida el formato)", () => {
    const bookings = [reserva(fecha, "09:00", "confirmada"), reserva(fecha, "09:30", "pendiente")];
    expect(activeBookingsOn(bookings, "20/10/2026")).toEqual([]);
  });
});

describe("generateSlots: un día bloqueado no ofrece turnos en el enlace público", () => {
  const base = {
    fecha: "2026-10-20",
    eventType: consulta,
    weeklySchedules: horario,
    bookings: [] as Booking[],
    settings,
    locks: [],
    now: new Date("2026-10-05T08:00:00"),
  };

  it("normal: un día laborable bloqueado con motivo devuelve una lista vacía de turnos", () => {
    const blockedDates: BlockedDate[] = [{ fecha: "2026-10-20", motivo: "Feriado administrativo" }];
    expect(generateSlots({ ...base, blockedDates })).toEqual([]);
  });

  it("borde: el motivo es opcional, un bloqueo sin motivo también deja el día sin turnos", () => {
    expect(generateSlots({ ...base, blockedDates: [{ fecha: "2026-10-20" }] })).toEqual([]);
  });

  it("borde: bloquear el día siguiente no afecta los turnos del día consultado", () => {
    const slots = generateSlots({ ...base, blockedDates: [{ fecha: "2026-10-21", motivo: "Congreso" }] });
    expect(slots).toHaveLength(6);
    expect(slots.every((s) => s.disponible)).toBe(true);
  });

  it("inválido: si un día bloqueado conserva una reserva activa (estado inconsistente), el bloqueo igual prevalece", () => {
    const slots = generateSlots({
      ...base,
      bookings: [reserva("2026-10-20", "09:00")],
      blockedDates: [{ fecha: "2026-10-20", motivo: "Capacitación" }],
    });
    expect(slots).toEqual([]);
  });
});

describe("getAvailableDates: el calendario público excluye los días bloqueados", () => {
  // Octubre 2026 tiene 22 días hábiles. `now` es del mes anterior para que todos sean reservables.
  const diasHabilesOctubre = [
    "2026-10-01", "2026-10-02",
    "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09",
    "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16",
    "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23",
    "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30",
  ];

  const base = {
    year: 2026,
    month: 9, // octubre (0 = enero)
    eventType: consulta,
    weeklySchedules: horario,
    bookings: [] as Booking[],
    settings,
    locks: [],
    now: new Date("2026-09-28T08:00:00"),
  };

  it("normal: el día bloqueado desaparece del calendario y el resto de los días hábiles sigue disponible", () => {
    const fechas = getAvailableDates({ ...base, blockedDates: [{ fecha: "2026-10-20", motivo: "Capacitación" }] });
    expect(fechas).not.toContain("2026-10-20");
    expect(fechas).toEqual(diasHabilesOctubre.filter((f) => f !== "2026-10-20"));
  });

  it("borde: bloquear un sábado (día sin horario de atención) no cambia los días disponibles", () => {
    const fechas = getAvailableDates({ ...base, blockedDates: [{ fecha: "2026-10-24" }] });
    expect(fechas).toEqual(diasHabilesOctubre);
  });

  it("borde: si se bloquean todos los días hábiles del mes, no queda ninguna fecha disponible", () => {
    const blockedDates: BlockedDate[] = diasHabilesOctubre.map((fecha) => ({ fecha, motivo: "Vacaciones" }));
    expect(getAvailableDates({ ...base, blockedDates })).toEqual([]);
  });

  it("inválido: un horario de única vez cargado en un día bloqueado no vuelve a habilitar ese día", () => {
    const sabadoEspecial: WeeklySchedule = {
      id: "sched-once",
      diaSemana: 6,
      franjas: [{ inicio: "09:00", fin: "12:00" }],
      tipo: "once",
      fechaInicio: "2026-10-24",
    };
    const conSabado = { ...base, weeklySchedules: [...horario, sabadoEspecial] };
    expect(getAvailableDates({ ...conSabado, blockedDates: [] })).toContain("2026-10-24");
    expect(getAvailableDates({ ...conSabado, blockedDates: [{ fecha: "2026-10-24", motivo: "Congreso" }] })).toEqual(
      diasHabilesOctubre
    );
  });
});
