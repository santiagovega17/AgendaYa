/**
 * TP6 — Flujo feliz de reserva pública (M04)
 * Estudiante: Bruno Moyano
 *
 * Arrange → Act → Assert sobre /agenda/dr-garcia
 */
describe("Reserva pública — happy path", () => {
  beforeEach(() => {
    // Estado limpio: el store de Zustand persiste en localStorage
    cy.visit("/agenda/dr-garcia", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.get('[data-cy="booking-page"]').should("be.visible");
  });

  it("completa una reserva de punta a punta", () => {
    // --- Arrange / Act: elegir tipo de evento ---
    cy.get('[data-cy="event-list"]').should("be.visible");
    cy.get('[data-cy="event-option"]').first().click();

    // --- Act: elegir fecha disponible y horario ---
    cy.get('[data-cy="booking-step-datetime"]').should("be.visible");
    cy.get('[data-cy="booking-date"]').first().click();
    cy.get('[data-cy="slot-list"]').should("be.visible");
    cy.get('[data-cy="slot-option"]').first().click();

    // --- Act: completar datos del invitado ---
    cy.get('[data-cy="booking-step-guest"]').should("be.visible");
    cy.get('[data-cy="guest-nombre"]').type("Bruno");
    cy.get('[data-cy="guest-apellido"]').type("Moyano");
    cy.get('[data-cy="guest-email"]').type("bruno.moyano@test.com");
    cy.get('[data-cy="guest-telefono"]').type("+54 11 1234-5678");
    cy.get('[data-cy="guest-nota"]').type("Reserva de prueba E2E");
    cy.get('[data-cy="confirm-booking"]').click();

    // --- Assert: pantalla de éxito ---
    cy.get('[data-cy="booking-success"]').should("be.visible");
    cy.get('[data-cy="booking-success"]').should(
      "contain.text",
      "¡Reserva confirmada!"
    );
    cy.get('[data-cy="booking-number"]')
      .should("be.visible")
      .and("contain.text", "AYA-");
    cy.get('[data-cy="booking-guest-name"]').should(
      "contain.text",
      "Bruno Moyano"
    );
  });
});
