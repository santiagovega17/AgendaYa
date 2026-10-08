/**
 * Requerimiento: AYA-M02-RF06 · Configuración de límite máximo de reservas por actividad
 * Casos del TP5: CP-007 (positivo) y CP-008 (negativo)
 */
describe("M02 - Límite diario de reservas", () => {
  const LIMITE_FORMATO = "El límite debe ser un número entero mayor a cero";
  const captura = (nombre: string) => {
    cy.dataCy("settings-limiteReservasDia").scrollIntoView({ offset: { top: -80, left: 0 } });
    cy.screenshot(nombre, { capture: "viewport" });
  };

  // cy.reload() en Chrome no siempre dispara el evento load de Next y el test se corta ahí.
  const recargarDisponibilidad = () => {
    cy.visit("/admin/disponibilidad");
    esperarConfiguracionCargada();
  };

  // Antelación mínima 0 solo existe en el entorno de test (el valor por defecto de la app es 2).
  const esperarConfiguracionCargada = () => cy.dataCy("settings-antelacionMinHoras").should("have.value", "0");

  beforeEach(() => {
    // Arrange (común): agenda de test con límite 8 y la pantalla Disponibilidad abierta
    cy.prepararAgenda({ limiteReservasDia: 8 });
    cy.loginAdmin("/admin/disponibilidad");
    esperarConfiguracionCargada();
  });

  it("CP-007: guarda un límite diario de reservas válido", () => {
    // Arrange: el límite configurado es 8 y no hay cambios para guardar
    cy.dataCy("settings-limiteReservasDia").should("have.value", "8");
    cy.dataCy("settings-save").should("be.disabled");

    // Act: ingresar 10 y guardar
    cy.dataCy("settings-limiteReservasDia").clear().type("10").blur();
    cy.dataCy("settings-limiteReservasDia-error").should("not.exist");
    // La barra superior es sticky: el clic por defecto la deja encima del botón.
    cy.dataCy("settings-save").should("be.enabled").click({ scrollBehavior: "center" });

    // Assert: confirmación visible
    cy.get("[data-sonner-toast]").should("contain.text", "Configuración diaria guardada exitosamente");
    captura("CP-007-1-limite-guardado");

    // Assert: al volver a entrar, el valor quedó guardado
    recargarDisponibilidad();
    cy.dataCy("settings-limiteReservasDia").should("have.value", "10");
    cy.dataCy("settings-save").should("be.disabled");
    captura("CP-007-2-valor-persistido");
  });

  it("CP-008: rechaza un límite diario de reservas igual a cero", () => {
    // Arrange: el límite configurado es 8
    cy.dataCy("settings-limiteReservasDia").should("have.value", "8");

    // Act: ingresar 0 y salir del campo
    cy.dataCy("settings-limiteReservasDia").clear().type("0").blur();

    // Assert: error del requerimiento debajo del campo
    cy.dataCy("settings-limiteReservasDia-error").should("be.visible").and("have.text", LIMITE_FORMATO);

    // Act: intentar guardar igual. El error alarga la tarjeta y el botón queda bajo la barra.
    cy.dataCy("settings-save").click({ scrollBehavior: "center" });

    // Assert: no se guarda, el foco vuelve al campo y el error sigue visible
    cy.dataCy("settings-limiteReservasDia").should("have.focus");
    cy.dataCy("settings-limiteReservasDia-error").should("have.text", LIMITE_FORMATO);
    cy.get("[data-sonner-toast]").should("not.exist");
    captura("CP-008-1-error-limite-cero");

    // Assert: al volver a entrar, el límite sigue en 8
    recargarDisponibilidad();
    cy.dataCy("settings-limiteReservasDia").should("have.value", "8");
    captura("CP-008-2-valor-sin-cambios");
  });
});
