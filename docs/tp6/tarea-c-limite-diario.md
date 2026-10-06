# TP6 · Tarea C · Tests unitarios con IA — Límite diario de reservas

- **Requerimiento:** AYA–M02–RF06 "Configuración de límite máximo de reservas por actividad" (el mismo de CP-007 y CP-008 del TP5).
- **Archivo:** [`src/lib/booking/limiteDiario.test.ts`](../../src/lib/booking/limiteDiario.test.ts) — 5 tests (Vitest).
- **Funciones probadas:**
  - `maxActiveBookingsPerDay(bookings, desde)` en `src/lib/booking/bookings.ts`: mayor cantidad de reservas activas de una misma actividad en un día, desde una fecha. Es el mínimo que acepta el formulario al bajar el límite.
  - `generateSlots(params)` en `src/lib/availability/generateSlots.ts`: turnos que ofrece el enlace público para un día; no devuelve ninguno si el día ya alcanzó el límite.
- **Herramienta:** agente de Cursor, con acceso al repositorio.

Cómo correrlos: `npx vitest run src/lib/booking/limiteDiario.test.ts --reporter=verbose`.

## 1. Prompt

> Tengo que hacer 5 tests unitarios del TP6 con Vitest sobre el requerimiento AYA–M02–RF06 «Límite máximo de reservas por actividad»: el administrador define cuántas reservas acepta por día y, cuando se alcanza, el enlace público deja de ofrecer turnos. Las reservas canceladas o completadas no cuentan. Buscá en el repositorio las funciones que implementan esta regla y escribí los tests cubriendo para cada una un caso normal, uno borde y uno inválido.

## 2. Output generado

Primer borrador que produjo el agente (5 tests, todos pasaban):

```ts
describe("maxActiveBookingsPerDay", () => {
  it("devuelve la mayor cantidad de reservas activas en un mismo día", () => {
    const bookings = [
      reserva("2026-10-20", "09:00"),
      reserva("2026-10-20", "10:00"),
      reserva("2026-10-21", "09:00"),
    ];
    expect(maxActiveBookingsPerDay(bookings, "2026-10-05")).toBe(2);
  });

  it("devuelve 0 si no hay reservas", () => {
    expect(maxActiveBookingsPerDay([], "2026-10-05")).toBe(0);
  });

  it("no cuenta las reservas canceladas", () => {
    const bookings = [reserva("2026-10-20", "09:00"), reserva("2026-10-20", "10:00", "cancelada")];
    expect(maxActiveBookingsPerDay(bookings, "2026-10-05")).toBe(1);
  });
});

describe("generateSlots con límite diario", () => {
  const now = new Date("2026-10-05T08:00:00");
  const params = { fecha: "2026-10-20", eventType: consulta, weeklySchedules: horario, blockedDates: [], settings, locks: [], now };

  it("ofrece turnos si el día no alcanzó el límite", () => {
    const slots = generateSlots({ ...params, bookings: [reserva("2026-10-20", "09:00")] });
    expect(slots.some((s) => s.disponible)).toBe(true);
  });

  it("no ofrece turnos si el día alcanzó el límite", () => {
    const bookings = [reserva("2026-10-20", "09:00"), reserva("2026-10-20", "09:30"), reserva("2026-10-20", "10:00")];
    expect(generateSlots({ ...params, bookings })).toEqual([]);
  });
});
```

El ayudante `reserva()` del borrador armaba todas las reservas con `horaFin` igual a `horaInicio`.

## 3. Modificaciones

Se mantuvo la cantidad de tests (5) y se cambió qué prueba cada uno, después de revisar el borrador contra el RF06:

| Test del borrador | Test final | Por qué |
|---|---|---|
| Devuelve la mayor cantidad de reservas activas en un mismo día. | **normal:** cuenta por actividad, no suma reservas de distintos tipos de evento del mismo día. | El RF06 dice "por actividad". El test final sigue verificando el máximo, pero agrega una reserva de "Control" ese día: si el código sumara todas las actividades, daría 3 en vez de 2. |
| Devuelve 0 si no hay reservas. | **borde:** cuenta las reservas del mismo día `desde` e ignora las del día anterior. | Sin reservas, el 0 es trivial. El parámetro `desde` no estaba probado y es un valor límite real: si la función usara `<=` en vez de `<`, ignoraría las reservas de hoy. |
| No cuenta las reservas canceladas. | **inválido:** las reservas canceladas o completadas no cuentan como activas. | `completada` tampoco es un estado activo y el borrador no lo cubría. |
| Ofrece turnos si el día no alcanzó el límite. | **normal:** las reservas canceladas y las de otra actividad no consumen el límite. | Con 1 reserva sobre un límite de 3 y `some(disponible)`, el test original pasaba aunque el código ignorara el límite. El nuevo prueba la regla "por actividad" desde el enlace público. |
| No ofrece turnos si el día alcanzó el límite. | **borde:** al alcanzar exactamente el límite el día no ofrece ningún turno. | Ya era un valor límite real; solo se aclaró el nombre. |

Además, `reserva()` calcula `horaFin` con la duración del evento, porque datos imposibles (fin igual al inicio) hacen que el test sea menos creíble.

## 4. Evaluación crítica

El borrador era correcto (todos sus tests pasaban por buenas razones) pero **no cubría lo que el requerimiento pide**. Para medirlo, se rompió el código a propósito de tres maneras y se corrieron ambas versiones, las dos con 5 tests:

| Error introducido en el código | Borrador | Versión final |
|---|---|---|
| `generateSlots` usa `>` en vez de `>=` (permite una reserva más que el límite) | Lo detecta | Lo detecta |
| `maxActiveBookingsPerDay` no separa por actividad | **No lo detecta** | Lo detecta |
| `maxActiveBookingsPerDay` ignora las reservas del día `desde` | **No lo detecta** | Lo detecta |

Qué no pudo hacer la herramienta sola: no dedujo del requerimiento las reglas que importan (por actividad, qué estados cuentan, el valor límite de `desde`). Escribió tests que confirmaban el comportamiento obvio. Hizo falta revisar el borrador contra el texto del RF06 y preguntarse "¿este test fallaría si el código estuviera mal?".

Algo que surgió al escribir los tests: el límite cuenta solo reservas de la misma actividad, así que en un mismo día el administrador puede llenar el límite de cada tipo de evento por separado. Coincide con el "por actividad" del RF06, pero el requerimiento no aclara si se buscaba un tope por actividad o un tope total del día. Los turnos superpuestos entre actividades los evita otra función (`markOverlappingSlots`), no el límite.

## 5. Evidencia de ejecución

```
 ✓ maxActiveBookingsPerDay … > normal: cuenta por actividad, no suma reservas de distintos tipos de evento del mismo día
 ✓ maxActiveBookingsPerDay … > borde: cuenta las reservas del mismo día `desde` e ignora las del día anterior
 ✓ maxActiveBookingsPerDay … > inválido: las reservas canceladas o completadas no cuentan como activas
 ✓ generateSlots … > borde: al alcanzar exactamente el límite el día no ofrece ningún turno
 ✓ generateSlots … > normal: las reservas canceladas y las de otra actividad no consumen el límite

 Test Files  1 passed (1)
      Tests  5 passed (5)
```
