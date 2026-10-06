# TP6 · Tarea C · Tests unitarios con IA — Bloqueo de días

- **Requerimiento:** AYA–M02–RF03 "Bloqueo de días" (el mismo de CP-009 y CP-010 del TP5).
- **Archivo:** [`src/lib/booking/bloqueoDias.test.ts`](../../src/lib/booking/bloqueoDias.test.ts) — 5 tests (Vitest).
- **Funciones probadas:**
  - `activeBookingsOn(bookings, fecha)` en `src/lib/booking/bookings.ts`: reservas pendientes o confirmadas de una fecha. Son las que se listan cuando el administrador intenta bloquear un día con reservas.
  - `generateSlots(params)` en `src/lib/availability/generateSlots.ts`: turnos de un día en el enlace público; un día bloqueado no devuelve ninguno.
  - `getAvailableDates(params)` en el mismo archivo: días del mes que el calendario público muestra como disponibles.
- **Herramienta:** subagente de Cursor (agente de propósito general con acceso de lectura al repositorio).

Cómo correrlos: `npx vitest run src/lib/booking/bloqueoDias.test.ts --reporter=verbose`.

## 1. Prompt

> Necesito 5 tests unitarios con Vitest para AgendaYA sobre el requerimiento AYA–M02–RF03 «Bloqueo de días»: un día bloqueado no ofrece turnos en el enlace público y, si tiene reservas pendientes o confirmadas, hay que listarlas antes de bloquearlo. Usá las funciones activeBookingsOn, generateSlots y getAvailableDates, y para cada una cubrí un caso normal, uno borde y uno inválido. Fijá la fecha actual para que los tests no dependan del día en que se corren y devolveme solo el archivo de test.

## 2. Output generado

La herramienta devolvió más tests de los pedidos: 12 (4 por función), sin ejecutarlos. Al correrlo, los 12 pasaron:

```ts
import { describe, expect, it } from "vitest";
import { generateSlots, getAvailableDates } from "@/lib/availability/generateSlots";
import { activeBookingsOn } from "@/lib/booking/bookings";
import type { BlockedDate, Booking, BookingSettings, EventType, WeeklySchedule } from "@/lib/types";

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

// Lunes a viernes de 09:00 a 12:00: 6 turnos de 30 minutos por día.
const horario: WeeklySchedule[] = [1, 2, 3, 4, 5].map((dia) => ({
  id: `sched-${dia}`,
  diaSemana: dia,
  franjas: [{ inicio: "09:00", fin: "12:00" }],
  tipo: "permanent",
}));

const settings: BookingSettings = { intervaloMin: 0, antelacionMinHoras: 0, antelacionMaxDias: 60, limiteReservasDia: 10 };

function reserva(fecha: string, horaInicio: string, estado: Booking["estado"] = "confirmada"): Booking {
  const [h, m] = horaInicio.split(":").map(Number);
  const fin = h * 60 + m + consulta.duracionMin;
  return {
    id: `${consulta.id}-${fecha}-${horaInicio}`,
    numeroReserva: `AYA-${fecha.slice(-2)}${horaInicio.replace(":", "")}`,
    eventTypeId: consulta.id,
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

  it("borde: sin reservas devuelve una lista vacía, así que el día se puede bloquear directamente", () => {
    expect(activeBookingsOn([], fecha)).toEqual([]);
  });

  it("borde: las reservas canceladas o completadas del día no impiden el bloqueo", () => {
    const bookings = [reserva(fecha, "09:00", "cancelada"), reserva(fecha, "09:30", "completada")];
    expect(activeBookingsOn(bookings, fecha)).toEqual([]);
  });

  it("inválido: una fecha con formato distinto de YYYY-MM-DD no coincide con ninguna reserva", () => {
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

  it("inválido: un bloqueo con fecha mal formateada no bloquea el día y se siguen ofreciendo turnos", () => {
    const slots = generateSlots({ ...base, blockedDates: [{ fecha: "20/10/2026", motivo: "Formato incorrecto" }] });
    expect(slots).toHaveLength(6);
    expect(slots.every((s) => s.disponible)).toBe(true);
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

  it("inválido: un bloqueo con fecha mal formateada no excluye ningún día del calendario", () => {
    const fechas = getAvailableDates({ ...base, blockedDates: [{ fecha: "2026/10/20" }] });
    expect(fechas).toContain("2026-10-20");
    expect(fechas).toHaveLength(22);
  });
});
```

## 3. Modificaciones

Del borrador se conservaron 3 tests, se agregaron 2 nuevos y se descartaron 9:

| Cambio | Por qué |
|---|---|
| Se conservaron "devuelve solo las reservas pendientes y confirmadas", "las canceladas o completadas no impiden el bloqueo" y "un día bloqueado no ofrece turnos" (antes con el nombre "un día laborable bloqueado con motivo devuelve una lista vacía de turnos"). | Son las tres reglas centrales del RF03: qué reservas se listan, cuáles no y que el día deja de ofrecerse. |
| **Nuevo:** un día con una reserva de "Consulta general" y otra de "Control" lista las dos. | El bloqueo es de todo el día, sin importar la actividad (a diferencia del límite diario del RF06, que es por actividad). El borrador solo usaba un tipo de evento. Para armarlo, `reserva()` recibe el tipo de evento como parámetro. |
| **Nuevo:** un horario de única vez cargado en un día bloqueado no vuelve a habilitar ese día. | Prueba un conflicto real entre dos funcionalidades del módulo. Verifica primero que, sin el bloqueo, ese sábado sí aparece en el calendario. |
| Se descartaron los tres casos inválidos (fecha con formato distinto de `YYYY-MM-DD`). | Los tres probaban lo mismo y presentaban como correcto algo que es una limitación: la función no valida el formato. No es una regla del RF03. |
| Se descartaron los casos borde redundantes (sin reservas, motivo opcional, bloqueo del día siguiente, bloqueo de un sábado, todo el mes bloqueado) y el caso normal de `getAvailableDates`. | Al romper el código a propósito (sección 4), ninguno detectaba un error que no detectaran ya los tests que quedaron. |

## 4. Evaluación crítica

El borrador era prolijo: compilaba, usaba los tipos reales, fijaba `now` en todos los casos y calculó a mano la lista de días hábiles de octubre. Pero tener más tests no lo hacía más efectivo. Para medirlo, se rompió el código a propósito de cinco maneras y se corrieron ambas versiones:

| Error introducido en el código | Borrador (12 tests) | Versión final (5 tests) |
|---|---|---|
| Las reservas completadas cuentan como activas | Lo detecta | Lo detecta |
| `generateSlots` ignora los días bloqueados | Lo detecta | Lo detecta |
| Las reservas pendientes no cuentan como activas | Lo detecta | Lo detecta |
| Un horario de única vez anula el bloqueo del día | **No lo detecta** | Lo detecta |
| Al bloquear, solo se listan reservas de una actividad | **No lo detecta** | Lo detecta |

Qué no pudo hacer la herramienta sola: escribió tests correctos y bien organizados, pero repitió variantes del mismo caso, no distinguió entre un comportamiento deseado y uno que simplemente ocurre (aceptó como "correcto" que una fecha mal formada no bloquee nada) y no buscó interacciones con otras partes del módulo, como los horarios de única vez. Eso salió de revisar los tests contra el requerimiento y preguntarse qué errores reales dejarían pasar.

Algo que surgió al revisar el borrador: ninguna de las funciones valida el formato de la fecha, y `activeBookingsOn` con una fecha mal escrita devuelve una lista vacía, que la pantalla interpretaría como "el día no tiene reservas". Hoy no es un problema porque la fecha siempre sale del calendario, pero conviene tenerlo presente si se agregan otras formas de bloquear días.

## 5. Evidencia de ejecución

```
 ✓ activeBookingsOn … > normal: devuelve solo las reservas pendientes y confirmadas de la fecha a bloquear
 ✓ activeBookingsOn … > normal: el bloqueo es de todo el día, así que lista las reservas de cualquier tipo de evento
 ✓ activeBookingsOn … > borde: las reservas canceladas o completadas del día no impiden el bloqueo
 ✓ generateSlots y getAvailableDates … > normal: un día laborable bloqueado no ofrece turnos
 ✓ generateSlots y getAvailableDates … > inválido: un horario de única vez cargado en un día bloqueado no vuelve a habilitar ese día

 Test Files  1 passed (1)
      Tests  5 passed (5)
```
