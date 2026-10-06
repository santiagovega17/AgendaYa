/**
 * Integrante: [Julian Serralta]
 * Requerimientos: AYA-M04-RF03, AYA-M04-RF04 y AYA-M04-RF06 · Proceso de reserva
 * Casos de prueba: CP-003, CP-004, CP-005, CP-006, CP-011 y CP-012
 */
describe("M04 - Proceso de reserva", () => {
  const ERROR_EMAIL = "Ingresá un email válido, por ejemplo nombre@correo.com";

  const iniciarReservaHastaDatos = () => {
    // Dejamos una fecha y hora conocidas para que el turno del 21/10 a las 11:00 sea futuro.
    cy.clock(new Date(2026, 9, 6, 8, 0, 0));
    cy.prepararAgenda();
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.elegirDia("2026-10-21");
    cy.dataCy("slot-option").filter('[data-hora="11:00"]').should("be.enabled").click();
    cy.dataCy("confirm-slot").click();
    cy.dataCy("guest-nota").should("be.visible");
  };

  const iniciarReservaEnFechaDePrueba = () => {
    // Congelamos el reloj en lunes 19/10/2026 a las 11:10 para reproducir el límite del caso.
    cy.clock(new Date(2026, 9, 19, 11, 10, 0));
    cy.prepararAgenda();
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.elegirDia("2026-10-19");
    cy.dataCy("slot-option").should("have.length", 18);
  };

  beforeEach(() => {
    // Arrange: usar el mismo tamaño de pantalla en todos los casos.
    cy.viewport(1280, 720);
  });

  it("CP-003: Ingresar datos personales válidos y confirmar la reserva exitosamente", () => {
    // Arrange: preparar agenda y llegar al formulario "Tus datos".
    iniciarReservaHastaDatos();

    // Act: ingresar datos personales válidos.
    cy.dataCy("guest-nombre").type("Juan");
    cy.dataCy("guest-apellido").type("Hernandez");
    cy.dataCy("guest-email").type(`juan.${Cypress._.random(1, 999999)}@example.com`);
    cy.dataCy("guest-telefono").type("54 9 261 846 7920");

    // Assert: el formulario permite confirmar la reserva.
    cy.dataCy("confirm-booking").should("be.enabled").click();

    // Assert: se muestra el comprobante con la actividad y el nombre correctos.
    cy.dataCy("booking-success-title").should("be.visible").and("contain.text", "¡Reserva confirmada!");
    cy.dataCy("booking-activity").should("have.text", "Consulta general");
    cy.dataCy("booking-guest-name").should("have.text", "Juan Hernandez");
  });

  it("CP-004: Rechazar un email sin '@' en los datos personales", () => {
    // Arrange: preparar agenda y llegar al formulario "Tus datos".
    iniciarReservaHastaDatos();

    // Act: ingresar un email inválido y salir del campo.
    cy.dataCy("guest-nombre").type("Juan");
    cy.dataCy("guest-apellido").type("Hernandez");
    cy.dataCy("guest-email").type("JHernandez.gmail.com").blur();
    cy.dataCy("guest-telefono").type("54 9 261 846 7920");

    // Assert: se muestra el error y no se permite confirmar.
    cy.dataCy("guest-email-error").should("be.visible").and("contain.text", ERROR_EMAIL);
    cy.dataCy("confirm-booking").should("be.disabled");
    cy.dataCy("booking-success").should("not.exist");
  });

  it("CP-005: acepta una nota de exactamente 200 caracteres", () => {
    // Arrange: iniciar una reserva y llegar al formulario de datos.
    iniciarReservaHastaDatos();
    const nota = "A".repeat(200);

    // Act: ingresar una nota con la longitud máxima permitida.
    cy.dataCy("guest-nota").type(nota);

    // Assert: la nota queda completa y el contador indica 200/200.
    cy.dataCy("guest-nota").should("have.value", nota);
    cy.dataCy("guest-nota-counter").should("have.text", "200/200");

    // Act: completar los datos obligatorios y confirmar la reserva.
    cy.dataCy("guest-nombre").type("Juan");
    cy.dataCy("guest-apellido").type("Hernandez");
    cy.dataCy("guest-email").type("juan.h@example.com");
    cy.dataCy("guest-telefono").type("2615551234");
    cy.dataCy("confirm-booking").should("be.enabled").click();

    // Assert: la reserva se confirma aunque la nota esté en el máximo permitido.
    cy.dataCy("booking-success").should("be.visible");
  });

  it("CP-006: impide superar los 200 caracteres de la nota", () => {
    // Arrange: iniciar una reserva y llegar al formulario de datos.
    iniciarReservaHastaDatos();

    // Act: intentar escribir 201 caracteres.
    cy.dataCy("guest-nota").type("A".repeat(200) + "B");

    // Assert: solo quedan los primeros 200 y el contador no supera el límite.
    cy.dataCy("guest-nota").should("have.value", "A".repeat(200));
    cy.dataCy("guest-nota-counter").should("have.text", "200/200");
  });

  it("CP-011: permite seleccionar un horario futuro disponible", () => {
    // Arrange: mostrar los turnos del lunes 19/10 a las 11:10.
    iniciarReservaEnFechaDePrueba();

    // Act: seleccionar el turno de las 15:00, que todavía es futuro.
    cy.dataCy("slot-option")
      .filter('[data-hora="15:00"]')
      .should("be.enabled")
      .and("have.attr", "data-vencido", "false")
      .click()
      .should("have.attr", "aria-pressed", "true");
  });

  it("CP-012: muestra vencidos y deshabilitados los turnos anteriores a las 11:10", () => {
    // Arrange: mostrar los turnos del lunes 19/10 a las 11:10.
    iniciarReservaEnFechaDePrueba();

    // Assert: los turnos anteriores a la hora actual no se pueden seleccionar.
    ["09:00", "09:30", "10:00", "10:30", "11:00"].forEach((hora) => {
      cy.dataCy("slot-option")
        .filter(`[data-hora="${hora}"]`)
        .should("have.attr", "data-vencido", "true")
        .and("be.disabled");
    });

    // Assert: el turno siguiente, a las 11:30, sigue disponible.
    cy.dataCy("slot-option")
      .filter('[data-hora="11:30"]')
      .should("have.attr", "data-vencido", "false")
      .and("be.enabled");
  });
});
