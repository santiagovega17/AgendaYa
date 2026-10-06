# AgendaYa

Sistema de reservas de turnos (Ingeniería y Calidad de Software, UTN-FRM, Grupo 6 4K9). Módulos asignados: **M02 - Gestión de disponibilidad** y **M04 - Proceso de reserva**.

Stack: Next.js 16 + React 19, Supabase (PostgreSQL), zod, Vitest (tests unitarios) y Cypress (tests E2E).

## 1. Levantar el frontend

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # completar con los datos que comparte el equipo
npm run dev
```

La app queda en <http://localhost:3000>:

- Panel del administrador: <http://localhost:3000/admin/login>
- Enlace público del entorno de test: <http://localhost:3000/agenda/laura-perez>

## 2. Tests unitarios (Vitest)

```bash
npm test
```

Los tests están junto al código que prueban (`src/**/*.test.ts`), por ejemplo `src/lib/validation/casosDePrueba.test.ts` (casos del TP5) y `src/lib/availability/generateSlots.test.ts`.

## 3. Tests E2E (Cypress)

### Configuración (una sola vez)

1. Agregar al `.env.local` las credenciales del **administrador de test** (las comparte el equipo):

   ```bash
   E2E_ADMIN_EMAIL=...
   E2E_ADMIN_PASSWORD=...
   ```

   No usar la cuenta demo: antes de cada test se borran las reservas, horarios y días bloqueados de esa cuenta.

2. Si Cypress avisa que no encuentra el binario, instalarlo con `npx cypress install`.

### Ejecución

Con el frontend levantado (`npm run dev`) en otra terminal:

```bash
npm run cy:open   # modo interactivo
npm run cy:run    # modo headless, deja capturas en cypress/screenshots si algo falla
```

Para correr un solo archivo: `npx cypress run --e2e --spec cypress/e2e/<archivo>.cy.ts`.

En modo interactivo los tests van a ritmo humano: pausa de 700 ms después de cada clic y tipeo tecla por tecla (`cypress/support/demora.ts`). En modo headless y en el CI no hay demora. Para cambiarla, definir `E2E_DEMORA_MS` en `.env.local` (`0` la desactiva; por ejemplo `E2E_DEMORA_MS=700 npm run cy:run` deja la demora en headless).

Todos usan la misma cuenta de test y cada test resetea su agenda: no correr los E2E en dos máquinas (o dos ventanas) al mismo tiempo.

`cypress/e2e/00-entorno.cy.ts` verifica que el entorno esté bien configurado. Si falla, revisar `.env.local` y que la app esté corriendo.

### Entorno de test

Cada test arranca con `cy.prepararAgenda()`, que deja la agenda del administrador de test en el mismo estado que los casos de prueba del TP5:

| Dato | Valor |
|---|---|
| Administrador | "Dra. Laura Pérez", enlace `/agenda/laura-perez` |
| Tipo de evento | "Consulta general": 30 min, presencial, confirmación automática |
| Horario laboral | Lunes a viernes de 09:00 a 18:00, permanente |
| Configuración | Intervalo 0 min, antelación mínima 0 h, máxima 30 días, límite diario 8 |
| Reservas y días bloqueados | Ninguno |

El escenario se puede ajustar (ver `cypress/tasks/prepararAgenda.ts`):

```ts
cy.prepararAgenda({
  conHorario: false,                     // agenda sin horario laboral
  limiteReservasDia: 10,
  reservas: [{ fecha, hora: "10:00", nombre: "María", apellido: "López" }],
  diasBloqueados: [{ fecha, motivo: "Capacitación" }],
});
```

Las fechas se calculan con `diaHabil()` (`cypress/support/fechas.ts`), que devuelve un día hábil relativo a hoy. Así los tests no dejan de funcionar cuando pasan las fechas fijas de los casos del TP5.

Comandos disponibles (`cypress/support/commands.ts`):

| Comando | Qué hace |
|---|---|
| `cy.dataCy("nombre")` | Atajo de `cy.get('[data-cy="nombre"]')` |
| `cy.prepararAgenda(escenario?)` | Resetea la agenda de test y carga el escenario |
| `cy.loginAdmin(ruta?)` | Inicia sesión como administrador de test y abre la ruta (por defecto el dashboard) |
| `cy.elegirDia("2026-10-21")` | Avanza el calendario visible hasta ese mes y hace clic en el día |
| `cy.mostrarDia("2026-10-21")` | Igual que `elegirDia` pero sin hacer clic: devuelve el día para verificarlo (por ejemplo, `.should("be.disabled")`) |

Los avisos (toasts) no son interactivos y no tienen `data-cy`: se verifican con `cy.contains("[data-sonner-toast]", "Horario guardado")`.

### Estructura de un test

Cada test va en su propio archivo en `cypress/e2e/`, por ejemplo `cypress/e2e/m04-email-invalido.cy.ts`. Todos los tests siguen el patrón Arrange / Act / Assert con esos comentarios:

```ts
import { diaHabil } from "../support/fechas";

describe("AgendaYA - M04 Proceso de reserva", () => {
  it("confirma una reserva con datos válidos", () => {
    // Arrange: agenda del entorno de test y enlace público abierto
    const fecha = diaHabil(7);
    cy.prepararAgenda();
    cy.visit("/agenda/laura-perez");

    // Act: elegir evento, día y horario, y completar los datos
    cy.dataCy("event-option").first().click();
    cy.elegirDia(fecha);
    cy.get('[data-cy="slot-option"][data-hora="10:00"]').click();
    cy.dataCy("confirm-slot").click();
    cy.dataCy("guest-nombre").type("Juan");
    // ...
    cy.dataCy("confirm-booking").click();

    // Assert: se muestra el comprobante
    cy.dataCy("booking-success-title").should("have.text", "¡Reserva confirmada!");
    cy.dataCy("booking-number").should("contain.text", "AYA-");
  });
});
```

### Selectores `data-cy` por flujo

**Login** (`/admin/login`): `login-email`, `login-password`, `login-submit`, `login-error`, `login-email-error`, `login-password-error`. Menú lateral: `nav-dashboard`, `nav-agenda`, `nav-disponibilidad`, `nav-eventos`, `nav-perfil`. Cerrar sesión: `user-menu` y luego `logout`.

**M02 - Configurar horario laboral** (`/admin/disponibilidad`):

- Página y semana: `disponibilidad-page`, `week-day` (con `data-dia` de 0 a 6, 0 = domingo), `week-day-range`, `week-day-off`
- Abrir el alta: `add-schedule`
- Diálogo: `schedule-dialog`, `schedule-day-0` … `schedule-day-6`, `schedule-weekdays`, `schedule-start-0`, `schedule-end-0`, `schedule-end-error-0`, `schedule-days-error`, `schedule-add-range`, `schedule-cancel`, `schedule-continue`
- Paso "¿Cómo querés aplicar este horario?": `schedule-type-once`, `schedule-type-permanent`, `schedule-start-date`, `schedule-start-date-hint`, `schedule-back`, `schedule-save`
- Franjas guardadas: `schedule-group` (con `data-tipo`), `schedule-group-days`, `schedule-group-ranges`, `schedule-group-status`, `schedule-actions`, `schedule-edit`, `schedule-delete`, `schedule-delete-confirm`
- Configuración de turnos: `settings-intervaloMin`, `settings-antelacionMinHoras`, `settings-antelacionMaxDias`, `settings-limiteReservasDia` (cada campo tiene su `...-error`), `settings-save`

**M02 - Bloquear un día** (`/admin/dashboard`):

- Modo bloqueo: `block-days-start`, `block-days-exit`, `calendar-title`, `block-reason`, `block-selected-count`, `block-days-submit`
- Confirmación: `block-confirm-dialog`, `block-confirm`, `block-confirm-cancel`
- Día con reservas: `block-conflict-dialog`, `block-conflict-booking` (con `data-numero`), `block-conflict-cancel`, `block-conflict-confirm`
- Días bloqueados: `blocked-day` (con `data-fecha`), `unblock-day`, `blocked-days-empty`
- Panel del día: `day-title`, `day-summary`, `day-booking` (con `data-numero`)

**M04 - Seleccionar fecha y hora** (`/agenda/laura-perez`):

- Página y evento: `booking-page`, `event-list`, `event-option` (con `data-nombre`), `no-events`
- Calendario: `calendar-day` (con `data-fecha`), `calendar-prev`, `calendar-next`
- Horarios: `slot-list`, `slot-list-date`, `slot-option` (con `data-hora` y `data-vencido`), `no-slots`
- Confirmar el horario: `confirm-slot`
- Avisos: `booking-info-dialog`, `booking-info-title`, `booking-info-description`, `booking-info-close`

**M04 - Completar formulario y confirmar reserva**:

- Paso de datos: `booking-step-guest`, `guest-slot-summary`, `guest-change-slot`, `countdown-timer`
- Campos: `guest-nombre`, `guest-apellido`, `guest-email`, `guest-telefono`, `guest-nota` (cada uno con su `...-error`), `guest-nota-counter`
- Confirmar: `confirm-booking`, `guest-form-hint`
- Comprobante: `booking-success` (con `data-estado`), `booking-success-title`, `booking-number`, `booking-activity`, `booking-date`, `booking-time`, `booking-admin`, `booking-guest-name`, `booking-restart`

El calendario del administrador usa los mismos `calendar-day`, `calendar-prev` y `calendar-next`.
