import type { AgendaState } from "@/lib/types";

const ADMIN_ID = "admin-1";

export function createSeedData(): AgendaState {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  return {
    profile: {
      id: ADMIN_ID,
      nombre: "Dr. Juan García",
      email: "juan.garcia@agendaya.com",
      foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=garcia",
      timezone: "America/Argentina/Buenos_Aires",
      slug: "dr-garcia",
    },
    eventTypes: [
      {
        id: "evt-1",
        adminId: ADMIN_ID,
        nombre: "Consulta",
        duracionMin: 30,
        modalidad: "presencial",
        confirmacionAuto: true,
        descripcion: "Consulta médica general de 30 minutos.",
        activo: true,
      },
      {
        id: "evt-2",
        adminId: ADMIN_ID,
        nombre: "Control",
        duracionMin: 15,
        modalidad: "presencial",
        confirmacionAuto: true,
        descripcion: "Control de seguimiento rápido.",
        activo: true,
      },
      {
        id: "evt-3",
        adminId: ADMIN_ID,
        nombre: "Videollamada",
        duracionMin: 45,
        modalidad: "virtual",
        confirmacionAuto: false,
        descripcion: "Consulta virtual por videollamada.",
        activo: true,
      },
    ],
    weeklySchedules: [1, 2, 3, 4, 5].map((dia) => ({
      id: `sched-${dia}`,
      diaSemana: dia,
      franjas: [{ inicio: "09:00", fin: "18:00" }],
      tipo: "permanent" as const,
      fechaInicio: "2026-01-01",
    })),
    blockedDates: [],
    settings: {
      intervaloMin: 10,
      antelacionMinHoras: 2,
      antelacionMaxDias: 30,
      limiteReservasDia: 8,
    },
    bookings: [
      {
        id: "bk-1",
        numeroReserva: "AYA-1001",
        eventTypeId: "evt-1",
        fecha: fmt(tomorrow),
        horaInicio: "10:00",
        horaFin: "10:30",
        invitado: {
          nombre: "María",
          apellido: "López",
          email: "maria@email.com",
          telefono: "+54 11 5555-1234",
        },
        estado: "confirmada",
        createdAt: new Date().toISOString(),
      },
      {
        id: "bk-2",
        numeroReserva: "AYA-1002",
        eventTypeId: "evt-2",
        fecha: fmt(dayAfter),
        horaInicio: "14:00",
        horaFin: "14:15",
        invitado: {
          nombre: "Carlos",
          apellido: "Ruiz",
          email: "carlos@email.com",
          telefono: "+54 11 5555-5678",
        },
        estado: "pendiente",
        createdAt: new Date().toISOString(),
      },
    ],
    slotLocks: [],
    notifications: [],
    isAuthenticated: false,
    scheduleVersion: 1,
  };
}
