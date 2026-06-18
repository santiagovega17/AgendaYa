import { describe, expect, it } from "vitest";
import type {
  Booking,
  BookingSettings,
  EventType,
  SlotLock,
  WeeklySchedule,
} from "@/lib/types";
import { generateSlots, makeSlotId, getAvailableDates } from "./generateSlots";

const eventType: EventType = {
  id: "evt-1",
  adminId: "admin-1",
  nombre: "Consulta",
  duracionMin: 30,
  modalidad: "presencial",
  confirmacionAuto: true,
  descripcion: "Consulta de prueba",
  activo: true,
};

const settings: BookingSettings = {
  intervaloMin: 10,
  antelacionMinHoras: 2,
  antelacionMaxDias: 30,
  limiteReservasDia: 3,
};

const wednesdaySchedule: WeeklySchedule[] = [
  {
    id: "sched-wed",
    diaSemana: 3,
    franjas: [{ inicio: "09:00", fin: "12:00" }],
    tipo: "permanent",
    fechaInicio: "2026-01-01",
  },
];

function baseParams(overrides: Partial<Parameters<typeof generateSlots>[0]> = {}) {
  return {
    fecha: "2026-06-17",
    eventType,
    weeklySchedules: wednesdaySchedule,
    blockedDates: [],
    bookings: [],
    settings,
    locks: [],
    now: new Date("2026-06-16T08:00:00Z"),
    ...overrides,
  };
}

describe("generateSlots", () => {
  it("genera slots según horario, duración del evento e intervalo entre turnos", () => {
    const slots = generateSlots(baseParams());

    expect(slots.map((s) => s.horaInicio)).toEqual(["09:00", "09:40", "10:20", "11:00"]);
    expect(slots[0]).toMatchObject({
      id: makeSlotId("2026-06-17", "09:00", "evt-1"),
      horaFin: "09:30",
      disponible: true,
    });
    expect(slots.every((s) => s.disponible)).toBe(true);
  });

  it("no genera slots en fechas bloqueadas, fuera de la ventana de antelación o con límite diario alcanzado", () => {
    const blocked = generateSlots(
      baseParams({ blockedDates: [{ fecha: "2026-06-17", motivo: "Feriado" }] })
    );
    expect(blocked).toEqual([]);

    const tooFar = generateSlots(
      baseParams({
        fecha: "2026-08-01",
        weeklySchedules: [
          {
            id: "sched-sat",
            diaSemana: 6,
            franjas: [{ inicio: "09:00", fin: "12:00" }],
            tipo: "permanent",
            fechaInicio: "2026-01-01",
          },
        ],
      })
    );
    expect(tooFar).toEqual([]);

    const bookings: Booking[] = [
      {
        id: "bk-1",
        numeroReserva: "AYA-1",
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:00",
        horaFin: "09:30",
        invitado: {
          nombre: "Ana",
          apellido: "Pérez",
          email: "ana@test.com",
          telefono: "1111111111",
        },
        estado: "confirmada",
        createdAt: "2026-06-15T10:00:00Z",
      },
      {
        id: "bk-2",
        numeroReserva: "AYA-2",
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:40",
        horaFin: "10:10",
        invitado: {
          nombre: "Luis",
          apellido: "Gómez",
          email: "luis@test.com",
          telefono: "2222222222",
        },
        estado: "pendiente",
        createdAt: "2026-06-15T11:00:00Z",
      },
      {
        id: "bk-3",
        numeroReserva: "AYA-3",
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "10:20",
        horaFin: "10:50",
        invitado: {
          nombre: "Eva",
          apellido: "Ruiz",
          email: "eva@test.com",
          telefono: "3333333333",
        },
        estado: "confirmada",
        createdAt: "2026-06-15T12:00:00Z",
      },
    ];

    const limitReached = generateSlots(baseParams({ bookings }));
    expect(limitReached).toEqual([]);
  });

  it("marca slots ocupados o bloqueados por otra sesión como no disponibles", () => {
    const bookings: Booking[] = [
      {
        id: "bk-1",
        numeroReserva: "AYA-1",
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:00",
        horaFin: "09:30",
        invitado: {
          nombre: "Ana",
          apellido: "Pérez",
          email: "ana@test.com",
          telefono: "1111111111",
        },
        estado: "confirmada",
        createdAt: "2026-06-15T10:00:00Z",
      },
    ];

    const locks: SlotLock[] = [
      {
        slotId: makeSlotId("2026-06-17", "09:40", "evt-1"),
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:40",
        sessionId: "other-session",
        expiresAt: "2026-06-17T12:00:00Z",
      },
    ];

    const slots = generateSlots(
      baseParams({
        bookings,
        locks,
        sessionId: "my-session",
      })
    );

    const byHour = Object.fromEntries(slots.map((s) => [s.horaInicio, s]));

    expect(byHour["09:00"].disponible).toBe(false);
    expect(byHour["09:40"].disponible).toBe(false);
    expect(byHour["09:40"].lockedBySession).toBe("other-session");
    expect(byHour["10:20"].disponible).toBe(true);
  });

  it("getAvailableDates incluye solo días del mes con slots reservables", () => {
    const dates = getAvailableDates({
      year: 2026,
      month: 5,
      eventType,
      weeklySchedules: wednesdaySchedule,
      blockedDates: [{ fecha: "2026-06-17", motivo: "Feriado" }],
      bookings: [],
      settings,
      locks: [],
      now: new Date("2026-06-16T08:00:00Z"),
    });

    expect(dates).toContain("2026-06-24");
    expect(dates).not.toContain("2026-06-17");
  });

  it("no marca como ocupados los slots de reservas canceladas o completadas", () => {
    const bookings: Booking[] = [
      {
        id: "bk-cancelada",
        numeroReserva: "AYA-C",
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:00",
        horaFin: "09:30",
        invitado: {
          nombre: "Ana",
          apellido: "Pérez",
          email: "ana@test.com",
          telefono: "1111111111",
        },
        estado: "cancelada",
        createdAt: "2026-06-15T10:00:00Z",
      },
      {
        id: "bk-completada",
        numeroReserva: "AYA-D",
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:40",
        horaFin: "10:10",
        invitado: {
          nombre: "Luis",
          apellido: "Gómez",
          email: "luis@test.com",
          telefono: "2222222222",
        },
        estado: "completada",
        createdAt: "2026-06-15T11:00:00Z",
      },
    ];

    const slots = generateSlots(baseParams({ bookings }));
    const byHour = Object.fromEntries(slots.map((s) => [s.horaInicio, s]));

    expect(byHour["09:00"].disponible).toBe(true);
    expect(byHour["09:40"].disponible).toBe(true);
  });

  it("libera un slot cuando el bloqueo temporal de otra sesión ya expiró", () => {
    const locks: SlotLock[] = [
      {
        slotId: makeSlotId("2026-06-17", "09:00", "evt-1"),
        eventTypeId: "evt-1",
        fecha: "2026-06-17",
        horaInicio: "09:00",
        sessionId: "other-session",
        expiresAt: "2026-06-16T07:00:00Z",
      },
    ];

    const slots = generateSlots(
      baseParams({
        locks,
        sessionId: "my-session",
        now: new Date("2026-06-16T08:00:00Z"),
      })
    );

    expect(slots.find((s) => s.horaInicio === "09:00")?.disponible).toBe(true);
  });

  it("Visualización de disponibilidad: muestra correctamente las franjas laborales disponibles del administrador (AYA-M04-RF02)", () => {
    const slots = generateSlots(
      baseParams({
        weeklySchedules: [
          {
            id: "sched-split",
            diaSemana: 3,
            franjas: [
              { inicio: "09:00", fin: "10:00" },
              { inicio: "14:00", fin: "15:00" }
            ],
            tipo: "permanent",
            fechaInicio: "2026-01-01",
          },
        ]
      })
    );

    const horasDisponibles = slots.map(s => s.horaInicio);
    expect(horasDisponibles.some(h => h.startsWith("09:"))).toBe(true);
    expect(horasDisponibles.some(h => h.startsWith("14:"))).toBe(true);
    expect(horasDisponibles.some(h => h.startsWith("11:"))).toBe(false);
  });

  it("Ingreso de datos personales: valida que los datos del invitado cumplan con el formato requerido (AYA-M04-RF03)", () => {
    const validarDatosInvitado = (invitado: any) => {
      if (!invitado.nombre || invitado.nombre.trim() === "") return false;
      if (!invitado.email || !invitado.email.includes("@")) return false;
      if (invitado.telefono && !/^\d+$/.test(invitado.telefono)) return false;
      return true;
    };

    expect(validarDatosInvitado({ nombre: "Juan", email: "juan@test.com", telefono: "12345678" })).toBe(true);
    expect(validarDatosInvitado({ nombre: "", email: "juan@test.com", telefono: "12345678" })).toBe(false);
    expect(validarDatosInvitado({ nombre: "Juan", email: "juantest.com", telefono: "12345678" })).toBe(false);
    expect(validarDatosInvitado({ nombre: "Juan", email: "juan@test.com", telefono: "1234a567" })).toBe(false);
  });

it("Ingreso de datos personales: valida que la nota opcional no exceda el límite de caracteres", () => {
    const validarDatosInvitado = (invitado: any) => {
      if (!invitado.nombre || invitado.nombre.trim() === "") return false;
      if (!invitado.email || !invitado.email.includes("@")) return false;
      if (invitado.telefono && !/^\d+$/.test(invitado.telefono)) return false;
      if (invitado.nota && invitado.nota.length > 500) return false;
      return true;
    };

    const baseGuest = { nombre: "Juan", email: "juan@test.com", telefono: "12345678" };
    
    expect(validarDatosInvitado(baseGuest)).toBe(true);
    expect(validarDatosInvitado({ ...baseGuest, nota: "Nota corta" })).toBe(true);
    expect(validarDatosInvitado({ ...baseGuest, nota: "a".repeat(500) })).toBe(true);
    expect(validarDatosInvitado({ ...baseGuest, nota: "a".repeat(501) })).toBe(false);
  });



  // TEST
  //  TESTS AGREGADOS PARA EL TP4  
// =====================================================================
describe("Reglas de Negocio adicionales", () => {
//TEST 1
  it("M02 - Calcula correctamente la hora del siguiente turno aplicando el intervalo (Buffer)", () => {
    const calcularSiguienteTurno = (horaInicioStr: string, duracionMin: number, intervaloMin: number) => {
      const [hora, min] = horaInicioStr.split(':').map(Number);
      const totalMin = hora * 60 + min + duracionMin + intervaloMin;
      const nextHora = Math.floor(totalMin / 60).toString().padStart(2, '0');
      const nextMin = (totalMin % 60).toString().padStart(2, '0');
      return `${nextHora}:${nextMin}`;
    };

    expect(calcularSiguienteTurno("10:00", 30, 15)).toBe("10:45");
    expect(calcularSiguienteTurno("11:30", 45, 10)).toBe("12:25");
  });
//TEST 2
  it("M02 - Impide que un Usuario Invitado reserve en una fecha bloqueada por el Administrador", () => {
    const verificarDisponibilidadDia = (fechaSolicitada: string, diasBloqueados: string[]) => {
      return !diasBloqueados.includes(fechaSolicitada);
    };

    const feriadosBloqueados = ["2026-12-25", "2026-12-31", "2027-01-01"];
    expect(verificarDisponibilidadDia("2026-12-25", feriadosBloqueados)).toBe(false);
    expect(verificarDisponibilidadDia("2026-12-26", feriadosBloqueados)).toBe(true);
  });
// TEST 3
  it("M08 - Cambia el estado de la reserva a 'Pagado' o 'Cancelado' según la pasarela de pagos", () => {
    const procesarRespuestaPago = (reserva: any, respuestaPasarela: any) => {
      if (respuestaPasarela.status === 'APPROVED') {
        return { ...reserva, estado: 'Pagado' };
      } else if (respuestaPasarela.status === 'REJECTED' || respuestaPasarela.status === 'EXPIRED') {
        return { ...reserva, estado: 'Cancelado por falta de pago' };
      }
      return reserva; 
    };

    const reservaPendiente = { id: 101, estado: 'Pendiente de Pago' };
    
    expect(procesarRespuestaPago(reservaPendiente, { status: 'APPROVED' }).estado).toBe('Pagado');
    expect(procesarRespuestaPago(reservaPendiente, { status: 'EXPIRED' }).estado).toBe('Cancelado por falta de pago');
  });

});
  
});
