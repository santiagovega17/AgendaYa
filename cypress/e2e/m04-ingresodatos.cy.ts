import { format } from "date-fns";
import { es } from "date-fns/locale";
import { diaHabil } from "../support/fechas";

/**
 * Requerimiento: AYA-M04-RF03 y AYA-M04-RF04 · Ingreso de datos personales y confirmación de la reserva
 * Casos del TP5: CP-003 (positivo) y CP-004 (negativo)
 */
describe("M04 - Ingreso de datos personales y validaciones en la reserva", () => {
  const ERROR_EMAIL = "Ingresá un email válido, por ejemplo nombre@correo.com";
  const fecha = diaHabil(7);
  const dia = format(new Date(`${fecha}T00:00:00`), "EEEE d 'de' MMMM", { locale: es });
  const fechaLarga = dia.charAt(0).toUpperCase() + dia.slice(1);
  // El contador queda fijo arriba: el offset deja visible el elemento debajo de él.
  const captura = (nombre: string, desde = "guest-slot-summary") => {
    cy.dataCy(desde).scrollIntoView({ offset: { top: -90, left: 0 } });
    cy.screenshot(nombre, { capture: "viewport" });
  };

  const elegirHorario = () => {
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.elegirDia(fecha);
    cy.dataCy("slot-option").filter('[data-hora="10:00"]').click();
    cy.dataCy("confirm-slot").click();
  };

  beforeEach(() => {
    // Arrange (común): agenda de test sin reservas y el invitado en el paso "Tus datos" con las 10:00 elegidas
    cy.prepararAgenda();
    elegirHorario();
    cy.dataCy("booking-step-guest").should("be.visible");
  });

  it("CP-003: ingresa datos personales válidos y confirma la reserva", () => {
    // Arrange: resumen del turno, contador activo y botón deshabilitado
    cy.dataCy("guest-slot-summary")
      .should("contain.text", "Consulta general")
      .and("contain.text", fechaLarga)
      .and("contain.text", "10:00 a 10:30 h");
    cy.dataCy("countdown-timer")
      .invoke("text")
      .should("match", /^\d{1,2}:\d{2}$/);
    cy.dataCy("confirm-booking").should("be.disabled");
    cy.dataCy("guest-form-hint").should("have.text", "Completá tus datos para confirmar.");

    // Act: completar nombre, apellido, email y teléfono válidos
    cy.dataCy("guest-nombre").type("Juan");
    cy.dataCy("guest-apellido").type("Hernandez");
    cy.dataCy("guest-email").type("JHernandez@gmail.com");
    cy.dataCy("guest-telefono").type("54 9 261 846 7920");

    // Assert: sin errores y con el botón habilitado
    cy.get('[data-cy$="-error"]').should("not.exist");
    cy.dataCy("guest-form-hint").should("not.exist");
    cy.dataCy("confirm-booking").should("be.enabled");
    captura("CP-003-1-datos-validos");

    // Act: confirmar la reserva
    cy.dataCy("confirm-booking").click();

    // Assert: comprobante con el número de reserva y los datos del turno
    cy.dataCy("booking-success-title").should("have.text", "¡Reserva confirmada!");
    cy.dataCy("booking-number")
      .invoke("text")
      .should("match", /^AYA-\d{4}$/);
    cy.dataCy("booking-activity").should("have.text", "Consulta general");
    cy.dataCy("booking-date").should("have.text", fechaLarga);
    cy.dataCy("booking-time").should("have.text", "10:00 a 10:30 h");
    cy.dataCy("booking-admin").should("have.text", "Dra. Laura Pérez");
    cy.dataCy("booking-guest-name").should("have.text", "Juan Hernandez");
    captura("CP-003-2-reserva-confirmada", "booking-success-title");

    // Assert: la reserva quedó registrada, así que las 10:00 de ese día ya no se ofrecen
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.elegirDia(fecha);
    cy.dataCy("slot-option").filter('[data-hora="10:00"]').should("be.disabled");
  });

  it("CP-004: rechaza un email sin '@' en los datos personales", () => {
    // Act: completar nombre, apellido y un email sin "@", y pasar al teléfono
    cy.dataCy("guest-nombre").type("Juan");
    cy.dataCy("guest-apellido").type("Hernandez");
    cy.dataCy("guest-email").type("JHernandez.gmail.com");
    cy.dataCy("guest-telefono").focus();

    // Assert: error visible debajo del email
    cy.dataCy("guest-email-error").should("be.visible").and("have.text", ERROR_EMAIL);

    // Act: completar el teléfono
    cy.dataCy("guest-telefono").type("54 9 261 846 7920");

    // Assert: el botón sigue deshabilitado y se mantiene el aviso
    cy.dataCy("confirm-booking").should("be.disabled");
    cy.dataCy("guest-form-hint").should("have.text", "Completá tus datos para confirmar.");
    captura("CP-004-1-email-invalido");

    // Act: intentar confirmar igual
    cy.dataCy("confirm-booking").click({ force: true });

    // Assert: sigue en "Tus datos" y no se registró ninguna reserva
    cy.dataCy("booking-step-guest").should("be.visible");
    cy.dataCy("booking-success").should("not.exist");
    captura("CP-004-2-sin-confirmar");
  });
});
