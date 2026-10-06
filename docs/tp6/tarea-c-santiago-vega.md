# TP6 · Tarea C · Tests unitarios con IA — Vega Gallardo, Santiago

- **Requerimiento:** AYA–M02–RF06 "Configuración de límite máximo de reservas por actividad" (el mismo de CP-007 y CP-008 del TP5).
- **Archivo:** [`src/lib/booking/limiteDiario.test.ts`](../../src/lib/booking/limiteDiario.test.ts) — 9 tests (Vitest).
- **Funciones probadas:**
  - `maxActiveBookingsPerDay(bookings, desde)` en `src/lib/booking/bookings.ts`: mayor cantidad de reservas activas de una misma actividad en un mismo día. La pantalla Disponibilidad la usa para rechazar un límite menor a las reservas que ya existen.
  - `generateSlots(params)` en `src/lib/availability/generateSlots.ts`: turnos que ve el invitado en el enlace público. Si el día ya tiene tantas reservas activas como el límite, no devuelve turnos.
- **Herramienta:** agente de Cursor, con acceso al repositorio.

Cómo correrlos: `npx vitest run src/lib/booking/limiteDiario.test.ts --reporter=verbose`.

## 1. Prompt

> Estoy haciendo el TP6 de Ingeniería y Calidad de Software sobre AgendaYA (Next.js + TypeScript, tests unitarios con Vitest). Me toca el requerimiento AYA–M02–RF06 «Configuración de límite máximo de reservas por actividad»: el administrador define cuántas reservas acepta por tipo de evento en un mismo día. El límite tiene que ser un entero mayor a cero, no puede quedar por debajo de las reservas que ya existen para un día, y cuando un día alcanza el límite el enlace público deja de ofrecer turnos de esa actividad. Solo cuentan las reservas activas (pendientes o confirmadas).
>
> Necesito al menos 5 tests unitarios sobre al menos 2 funciones, cubriendo caso normal, caso borde y caso inválido. Buscá en el repositorio las funciones que implementan esta regla (la validación del formulario ya está cubierta por los tests del TP5, en `src/lib/validation/casosDePrueba.test.ts`), leé sus tipos en `src/lib/types/index.ts` y pasá siempre una fecha `now` fija para que los tests no dependan del día en que se corren. Indicá en el nombre de cada test si es normal, borde o inválido.

En la conversación el pedido fue más corto («has mis 5 test unitarios»). El resto del prompt es el contexto que el agente ya tenía en esa misma conversación (el enunciado del TP6 y mis casos CP-007 y CP-008 del TP5), escrito acá de forma explícita. Con eso el agente buscó en el código las funciones que implementan el límite y eligió las dos de arriba.

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

Se hicieron en la misma sesión, después de correr el borrador y revisarlo contra el RF06:

| Cambio | Por qué |
|---|---|
| Nuevo test: dos reservas del mismo día pero de distinto tipo de evento cuentan 1, no 2. | El RF06 dice "por actividad". El borrador no lo probaba y su primer test hablaba de "un mismo día", que es otra regla. |
| Nuevo test: las reservas del día anterior a `desde` no cuentan y las del propio día `desde` sí. | El parámetro `desde` no estaba probado. Es un valor límite: si la función usara `<=` en vez de `<`, ignoraría las reservas de hoy. |
| El test de canceladas pasó a incluir también `completada` y a esperar 0. | `completada` tampoco es un estado activo y el borrador no lo cubría. |
| "Ofrece turnos si no alcanzó el límite" pasó a usar límite − 1 reservas y a verificar exactamente qué turnos quedan libres. | Con 1 reserva sobre un límite de 3 y `some(disponible)`, el test pasaba aunque el código ignorara el límite por completo. Con límite − 1 es un caso borde real. |
| Nuevo test: las reservas canceladas y las de otra actividad no consumen el límite en `generateSlots`. | Es la misma regla de "por actividad" vista desde el enlace público. |
| Nuevo test: con límite 0 el día no ofrece turnos. | Caso inválido: el formulario rechaza el 0 (CP-008), pero si llegara a guardarse, conviene saber que la agenda se cierra en lugar de quedar sin tope. |
| Cada nombre indica si el caso es normal, borde o inválido, y `reserva()` calcula `horaFin` con la duración del evento. | El TP pide cubrir esas tres clases de casos, y datos imposibles (fin igual al inicio) hacen que el test sea menos creíble. |

## 4. Evaluación crítica

El borrador era correcto (todos sus tests pasaban por buenas razones) pero **no cubría lo que el requerimiento pide**. Para medirlo, se rompió el código a propósito de tres maneras y se corrieron ambas versiones:

| Error introducido en el código | Borrador (5 tests) | Versión final (9 tests) |
|---|---|---|
| `generateSlots` usa `>` en vez de `>=` (permite una reserva más que el límite) | Lo detecta | Lo detectan 2 tests |
| `maxActiveBookingsPerDay` no separa por actividad | **No lo detecta** | Lo detecta |
| `maxActiveBookingsPerDay` ignora las reservas del día `desde` | **No lo detecta** | Lo detecta |

Qué no pudo hacer la herramienta sola: en el primer intento no dedujo del requerimiento las reglas que importan (por actividad, qué estados cuentan, el valor límite de `desde`). Escribió tests que confirmaban el comportamiento obvio. Hizo falta revisar el borrador contra el texto del RF06 y preguntarse "¿este test fallaría si el código estuviera mal?".

Algo que surgió al escribir los tests: el límite cuenta solo reservas de la misma actividad, así que en un mismo día el administrador puede llenar el límite de cada tipo de evento por separado. Coincide con el "por actividad" del RF06, pero el requerimiento no aclara si se buscaba un tope por actividad o un tope total del día (sirve para la pregunta 1 de la reflexión, sobre ambigüedades). Los turnos superpuestos entre actividades los evita otra función (`markOverlappingSlots`), no el límite.

## 5. Evidencia de ejecución

```
 ✓ maxActiveBookingsPerDay … > normal: devuelve la cantidad del día con más reservas activas
 ✓ maxActiveBookingsPerDay … > normal: cuenta por actividad, no suma reservas de distintos tipos de evento del mismo día
 ✓ maxActiveBookingsPerDay … > borde: sin reservas devuelve 0, así que cualquier límite válido es aceptable
 ✓ maxActiveBookingsPerDay … > borde: cuenta las reservas del mismo día `desde` e ignora las del día anterior
 ✓ maxActiveBookingsPerDay … > inválido: las reservas canceladas o completadas no cuentan como activas
 ✓ generateSlots … > borde: con una reserva menos que el límite se siguen ofreciendo los turnos libres
 ✓ generateSlots … > borde: al alcanzar exactamente el límite el día no ofrece ningún turno
 ✓ generateSlots … > normal: las reservas canceladas y las de otra actividad no consumen el límite
 ✓ generateSlots … > inválido: un límite 0 (que el formulario rechaza) cierra el día en lugar de permitir reservas sin tope

 Test Files  1 passed (1)
      Tests  9 passed (9)
```
