import { diaHabil } from "../support/fechas";

/**
 * Requerimiento: AYA-M04-RNF04 · Límite de caracteres de la nota opcional (US-M04-09)
 * Casos del TP5: CP-005 (positivo) y CP-006 (negativo)
 */
describe("M04 - Nota opcional de la reserva", () => {
  const NOTA_MAX = 200;
  const fecha = diaHabil(7);
  // La nota se pega de una vez, como en el TP5, aunque la ventana de Cypress tipee letra por letra.
  const pegar = { delay: 0 };
  // El contador queda fijo arriba: el offset deja visibles los datos y la nota.
  const captura = (nombre: string, desde = "guest-email") => {
    cy.dataCy(desde).scrollIntoView({ offset: { top: -120, left: 0 } });
    cy.screenshot(nombre, { capture: "viewport" });
  };

  const llegarATusDatos = (hora: string) => {
    // Mismo alto que la captura: si no, la barra inferior tapa el contador de la nota en la imagen.
    cy.viewport(1280, 720);
    cy.prepararAgenda();
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.elegirDia(fecha);
    cy.dataCy("slot-option").filter(`[data-hora="${hora}"]`).click();
    cy.dataCy("confirm-slot").click();
    cy.dataCy("booking-step-guest").should("be.visible");
  };

  const completarDatos = () => {
    cy.dataCy("guest-nombre").type("Lucía");
    cy.dataCy("guest-apellido").type("Fernández");
    cy.dataCy("guest-email").type("lucia.fernandez@mail.com");
    cy.dataCy("guest-telefono").type("2615551234");
  };

  it("CP-005: acepta una nota opcional de exactamente 200 caracteres", () => {
    // Arrange: invitado en "Tus datos" con las 11:00 elegidas y los datos obligatorios completos
    llegarATusDatos("11:00");
    completarDatos();
    cy.get('[data-cy$="-error"]').should("not.exist");
    cy.dataCy("confirm-booking").should("be.enabled");
    cy.dataCy("guest-nota-counter").should("have.text", `0/${NOTA_MAX}`).and("not.have.class", "text-destructive");

    // Act: pegar una nota con el máximo permitido
    const nota = "A".repeat(NOTA_MAX);
    cy.dataCy("guest-nota").type(nota, pegar);

    // Assert: la nota queda completa, el contador marca el límite en rojo y se puede confirmar
    cy.dataCy("guest-nota").should("have.value", nota);
    cy.dataCy("guest-nota-counter")
      .should("have.text", `${NOTA_MAX}/${NOTA_MAX}`)
      .and("have.class", "text-destructive")
      .and("have.class", "font-semibold");
    cy.dataCy("guest-nota-error").should("not.exist");
    cy.dataCy("confirm-booking").should("be.enabled");
    captura("CP-005-1-nota-200-caracteres");

    // Act: confirmar la reserva
    cy.dataCy("confirm-booking").click();

    // Assert: la reserva se confirma con la nota en el máximo permitido
    cy.dataCy("booking-success-title").should("have.text", "¡Reserva confirmada!");
    cy.dataCy("booking-number").invoke("text").should("match", /^AYA-\d{4}$/);
    cy.dataCy("booking-time").should("have.text", "11:00 a 11:30 h");
    cy.dataCy("booking-guest-name").should("have.text", "Lucía Fernández");
    captura("CP-005-2-reserva-confirmada", "booking-success-title");
  });

  it("CP-006: impide que la nota opcional supere los 200 caracteres", () => {
    // Arrange: invitado en "Tus datos" con las 12:00 elegidas y los datos obligatorios completos
    llegarATusDatos("12:00");
    completarDatos();
    cy.dataCy("guest-nota-counter").should("have.text", `0/${NOTA_MAX}`);

    // Act: pegar una nota de 201 caracteres (200 "A" y una "B" al final)
    const permitida = "A".repeat(NOTA_MAX);
    cy.dataCy("guest-nota").type(`${permitida}B`, pegar);

    // Assert: solo quedan los primeros 200 caracteres y el contador no pasa del límite
    cy.dataCy("guest-nota").should("have.value", permitida);
    cy.dataCy("guest-nota-counter").should("have.text", `${NOTA_MAX}/${NOTA_MAX}`).and("have.class", "text-destructive");
    captura("CP-006-1-nota-recortada");

    // Act: ubicar el cursor al final y tipear una "X"
    cy.dataCy("guest-nota").type("{end}X");

    // Assert: el carácter no se agrega y el contador sigue en 200/200
    cy.dataCy("guest-nota").invoke("val").should("have.length", NOTA_MAX).and("not.contain", "X");
    cy.dataCy("guest-nota-counter").should("have.text", `${NOTA_MAX}/${NOTA_MAX}`);
    captura("CP-006-2-sin-caracter-extra");
  });
});
