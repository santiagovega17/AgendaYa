/**
 * TP6 — Configurar horario laboral (M02)
 * Estudiante: Nicolas
 *
 * Arrange → Act → Assert sobre /admin/disponibilidad
 */
function capturarPaso(nombre: string) {
  cy.get('[data-cy="disponibilidad-page"]').screenshot(nombre, { padding: 16 });
}

describe("AgendaYA - M02 Disponibilidad", () => {
  beforeEach(() => {
    // M02 es flujo admin desktop: el sidebar usa lg:flex
    cy.viewport(1280, 800);

    // Estado limpio: el store de Zustand persiste en localStorage
    cy.visit("/admin/login", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.get('[data-cy="login-page"]').should("be.visible");
  });

  it("configura un horario laboral permanente", () => {
    // --- Arrange: iniciar sesión como administrador ---
    cy.get('[data-cy="login-email"]').clear().type("nicolas.m02@test.com");
    cy.get('[data-cy="login-password"]').clear().type("demo1234");
    cy.get('[data-cy="login-submit"]').click();
    cy.url().should("include", "/admin/dashboard");

    // --- Act: ir a Disponibilidad y abrir el alta de horario ---
    cy.get('[data-cy="nav-disponibilidad"]').should("be.visible").click();
    cy.url().should("include", "/admin/disponibilidad");
    cy.get('[data-cy="disponibilidad-page"]').should("be.visible");
    capturarPaso("01-disponibilidad");
    cy.get('[data-cy="add-schedule"]').click();
    cy.get('[data-cy="schedule-modal"]').should("be.visible");

    // --- Act: completar día/hora (Sábado no viene en el seed Lun-Vie) ---
    cy.get('[data-cy="schedule-day-select"]').select("6"); // Sábado
    cy.get('[data-cy="schedule-start"]')
      .focus()
      .clear()
      .type("10:00");
    cy.get('[data-cy="schedule-end"]')
      .focus()
      .clear()
      .type("13:00");
    cy.get('[data-cy="schedule-type"]').select("permanent");
    capturarPaso("02-formulario-horario");
    cy.get('[data-cy="save-schedule"]').click();

    // --- Assert: toast de éxito y horario visible en la lista ---
    cy.get('[data-cy="toast"]').should("be.visible");
    cy.get('[data-cy="toast-message"]').should(
      "contain.text",
      "Horario permanente guardado."
    );
    cy.get('[data-cy="schedule-item"][data-cy-day="Sábado"]')
      .should("be.visible")
      .within(() => {
        cy.get('[data-cy="schedule-day"]').should("contain.text", "Sábado");
        cy.get('[data-cy="schedule-range"]').should("contain.text", "10:00–13:00");
        cy.get('[data-cy="schedule-range"]').should("contain.text", "Permanente");
      });
    capturarPaso("03-horario-guardado");
  });
});
