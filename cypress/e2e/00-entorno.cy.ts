/**
 * Verificación del entorno de test.
 * Si estos tests fallan, revisar .env.local y que el frontend esté levantado.
 */
describe("AgendaYA - Entorno de test", () => {
  it("publica la agenda del administrador de test en el enlace público", () => {
    // Arrange: agenda en el estado del entorno de test
    cy.prepararAgenda();

    // Act: abrir el enlace público
    cy.visit("/agenda/laura-perez");

    // Assert: se ofrece el único tipo de evento del entorno
    cy.dataCy("event-option").should("have.length", 1).and("contain.text", "Consulta general");
  });

  it("inicia sesión con el administrador de test", () => {
    // Arrange: agenda con el horario laboral de Lun a Vie
    cy.prepararAgenda();

    // Act: iniciar sesión e ir a Disponibilidad
    cy.loginAdmin("/admin/disponibilidad");

    // Assert: el horario del entorno aparece agrupado en una sola franja
    cy.dataCy("schedule-group").should("have.length", 1);
    cy.dataCy("schedule-group-days").should("have.text", "Lun a Vie");
    cy.dataCy("schedule-group-ranges").should("have.text", "09:00–18:00");
  });
});
