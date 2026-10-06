# TP6 · Tarea C · Tests unitarios con IA — Rosales Pedroza, Nicolás

- **Requerimiento:** AYA–M02–RF03 "Bloqueo de días" (el mismo de CP-009 y CP-010 del TP5).
- **Archivo:** [`src/lib/booking/bloqueoDias.test.ts`](../../src/lib/booking/bloqueoDias.test.ts) — 13 tests (Vitest).
- **Funciones probadas:**
  - `activeBookingsOn(bookings, fecha)` en `src/lib/booking/bookings.ts`: reservas pendientes o confirmadas de una fecha. Son las que se listan cuando el administrador intenta bloquear un día con reservas.
  - `generateSlots(params)` en `src/lib/availability/generateSlots.ts`: turnos de un día en el enlace público; un día bloqueado no devuelve ninguno.
  - `getAvailableDates(params)` en el mismo archivo: días del mes que el calendario público muestra como disponibles.
- **Herramienta:** subagente de Cursor (agente de propósito general con acceso de lectura al repositorio). Recibió solo el prompt de abajo, sin el resto de la conversación.

Cómo correrlos: `npx vitest run src/lib/booking/bloqueoDias.test.ts --reporter=verbose`.

## 1. Prompt

Texto exacto que recibió la herramienta:

> Estoy haciendo el TP6 de Ingeniería y Calidad de Software sobre AgendaYA (Next.js + TypeScript, tests unitarios con Vitest). El repositorio está en: /Users/santiago/Library/Mobile Documents/com~apple~CloudDocs/UTN/4to año/Ingeniería y Calidad de Software/Práctica/app.nosync
>
> Soy Nicolás Rosales Pedroza y me toca el requerimiento AYA–M02–RF03 «Bloqueo de días»: el administrador puede bloquear días completos (con un motivo opcional). Un día bloqueado no ofrece turnos en el enlace público. Si el día tiene reservas activas (pendientes o confirmadas), no se bloquea directamente: el sistema lista las reservas afectadas para que el administrador confirme si quiere cancelarlas. Las reservas canceladas o completadas no impiden el bloqueo.
>
> Necesito al menos 5 tests unitarios con Vitest sobre al menos 2 funciones, cubriendo para cada una el caso normal, algún caso borde y algún caso inválido o de error. Las funciones son:
> - activeBookingsOn(bookings, fecha) en src/lib/booking/bookings.ts: devuelve las reservas pendientes o confirmadas de esa fecha.
> - generateSlots(params) en src/lib/availability/generateSlots.ts: devuelve [] si la fecha está en blockedDates.
> - getAvailableDates(params) en el mismo archivo: devuelve los días del mes que tienen al menos un turno disponible.
>
> Leé esos archivos y src/lib/types/index.ts para conocer los tipos exactos. Importá con el alias "@/lib/...". Pasá siempre `now` fijo a las funciones para que los tests no dependan de la fecha real. Indicá en el nombre de cada test si es un caso normal, borde o inválido.
>
> No modifiques ni crees archivos y no ejecutes los tests: devolvé solamente el contenido completo del archivo de test, que se va a llamar src/lib/booking/bloqueoDias.test.ts, dentro de un único bloque de código.

## 2. Output generado

La herramienta devolvió un archivo con 12 tests (4 por función), sin ejecutarlos. Al correrlo, los 12 pasaron:

```ts
import { describe, expect, it } from "vitest";
import { generateSlots, getAvailableDates } from "@/lib/availability/generateSlots";
import { activeBookingsOn } from "@/lib/booking/bookings";
import type { BlockedDate, Booking, BookingSettings, EventType, WeeklySchedule } from "@/lib/types";

// TP6 · Rosales Pedroza, Nicolás
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

| Cambio | Por qué |
|---|---|
| Nuevo test: un día con una reserva de "Consulta general" y otra de "Control" lista las dos. | Es la regla más propia del RF03: el bloqueo es de todo el día, sin importar la actividad (a diferencia del límite diario del RF06, que es por actividad). El borrador solo usaba un tipo de evento. |
| El caso inválido de `activeBookingsOn` (fecha en formato `20/10/2026`) se mantuvo, pero con otro nombre y un comentario. | El borrador lo presentaba como comportamiento correcto. En realidad documenta una limitación: la función no valida el formato y, si la fecha llegara mal, el día se bloquearía sin avisar de sus reservas. En la app no pasa porque la fecha sale del calendario. |
| El caso inválido de `generateSlots` se reemplazó por "un día bloqueado que conserva una reserva activa igual no ofrece turnos". | El original repetía la idea de la fecha mal escrita. Un estado inconsistente (bloqueado y con reservas) es un caso de error más relevante: el bloqueo tiene que prevalecer. |
| El caso inválido de `getAvailableDates` se reemplazó por "un horario de única vez cargado en un día bloqueado no lo vuelve a habilitar". | Mismo motivo. El nuevo prueba un conflicto real entre dos funcionalidades del módulo (horario especial y bloqueo) y verifica primero que, sin el bloqueo, ese sábado sí aparecería. |
| `reserva()` recibe el tipo de evento como parámetro. | Para poder armar reservas de distintas actividades en el test nuevo. |

## 4. Evaluación crítica

El borrador era bueno: compilaba, usaba los tipos reales, fijaba `now` en todos los casos, ya cubría reservas canceladas y completadas, y calculó a mano la lista de días hábiles de octubre. Su debilidad estaba en los casos inválidos: los tres probaban lo mismo (una fecha mal escrita) y los daba por buenos aunque reflejan que el código no valida.

Para medirlo, se rompió el código a propósito de cinco maneras y se corrieron ambas versiones:

| Error introducido en el código | Borrador (12 tests) | Versión final (13 tests) |
|---|---|---|
| Las reservas completadas cuentan como activas | Lo detecta | Lo detecta |
| `generateSlots` ignora los días bloqueados | Lo detecta (4 tests) | Lo detecta (6 tests) |
| Las reservas pendientes no cuentan como activas | Lo detecta | Lo detecta (2 tests) |
| Un horario de única vez anula el bloqueo del día | **No lo detecta** | Lo detecta |
| Al bloquear, solo se listan reservas de una actividad | **No lo detecta** | Lo detecta |

Qué no pudo hacer la herramienta sola: con un prompt detallado escribió tests correctos y bien organizados, pero no distinguió entre un comportamiento deseado y uno que simplemente ocurre (aceptó como "correcto" que una fecha mal formada no bloquee nada). Tampoco buscó interacciones con otras partes del módulo, como los horarios de única vez. Eso salió de revisar los tests contra el requerimiento y preguntarse qué errores reales dejarían pasar.

Algo que surgió al escribir los tests: ninguna de las funciones valida el formato de la fecha, y `activeBookingsOn` con una fecha mal escrita devuelve una lista vacía, que la pantalla interpreta como "el día no tiene reservas". Hoy no es un problema porque la fecha siempre sale del calendario, pero conviene tenerlo presente si se agregan otras formas de bloquear días.

## 5. Evidencia de ejecución

```
 ✓ activeBookingsOn … > normal: devuelve solo las reservas pendientes y confirmadas de la fecha a bloquear
 ✓ activeBookingsOn … > normal: el bloqueo es de todo el día, así que lista las reservas de cualquier tipo de evento
 ✓ activeBookingsOn … > borde: sin reservas devuelve una lista vacía, así que el día se puede bloquear directamente
 ✓ activeBookingsOn … > borde: las reservas canceladas o completadas del día no impiden el bloqueo
 ✓ activeBookingsOn … > inválido: con una fecha en otro formato no encuentra reservas (no valida el formato)
 ✓ generateSlots … > normal: un día laborable bloqueado con motivo devuelve una lista vacía de turnos
 ✓ generateSlots … > borde: el motivo es opcional, un bloqueo sin motivo también deja el día sin turnos
 ✓ generateSlots … > borde: bloquear el día siguiente no afecta los turnos del día consultado
 ✓ generateSlots … > inválido: si un día bloqueado conserva una reserva activa (estado inconsistente), el bloqueo igual prevalece
 ✓ getAvailableDates … > normal: el día bloqueado desaparece del calendario y el resto de los días hábiles sigue disponible
 ✓ getAvailableDates … > borde: bloquear un sábado (día sin horario de atención) no cambia los días disponibles
 ✓ getAvailableDates … > borde: si se bloquean todos los días hábiles del mes, no queda ninguna fecha disponible
 ✓ getAvailableDates … > inválido: un horario de única vez cargado en un día bloqueado no vuelve a habilitar ese día

 Test Files  1 passed (1)
      Tests  13 passed (13)
```
