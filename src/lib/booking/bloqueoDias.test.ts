import { describe, expect, it } from "vitest";
import { generateSlots, getAvailableDates } from "@/lib/availability/generateSlots";
import { activeBookingsOn } from "@/lib/booking/bookings";
import type { Booking, BookingSettings, EventType, WeeklySchedule } from "@/lib/types";

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

  it("borde: las reservas canceladas o completadas del día no impiden el bloqueo", () => {
    const bookings = [reserva(fecha, "09:00", "cancelada"), reserva(fecha, "09:30", "completada")];
    expect(activeBookingsOn(bookings, fecha)).toEqual([]);
  });
});

describe("generateSlots y getAvailableDates: un día bloqueado no se ofrece en el enlace público", () => {
  it("normal: un día laborable bloqueado no ofrece turnos", () => {
    const slots = generateSlots({
      fecha: "2026-10-20",
      eventType: consulta,
      weeklySchedules: horario,
      bookings: [],
      blockedDates: [{ fecha: "2026-10-20", motivo: "Capacitación" }],
      settings,
      locks: [],
      now: new Date("2026-10-05T08:00:00"),
    });
    expect(slots).toEqual([]);
  });

  it("inválido: un horario de única vez cargado en un día bloqueado no vuelve a habilitar ese día", () => {
    const sabadoEspecial: WeeklySchedule = {
      id: "sched-once",
      diaSemana: 6,
      franjas: [{ inicio: "09:00", fin: "12:00" }],
      tipo: "once",
      fechaInicio: "2026-10-24",
    };
    const params = {
      year: 2026,
      month: 9, // octubre (0 = enero)
      eventType: consulta,
      weeklySchedules: [...horario, sabadoEspecial],
      bookings: [],
      settings,
      locks: [],
      now: new Date("2026-09-28T08:00:00"),
    };
    expect(getAvailableDates({ ...params, blockedDates: [] })).toContain("2026-10-24");
    expect(getAvailableDates({ ...params, blockedDates: [{ fecha: "2026-10-24", motivo: "Congreso" }] })).not.toContain(
      "2026-10-24"
    );
  });
});
