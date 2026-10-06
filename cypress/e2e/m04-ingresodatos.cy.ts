/**
 * Integrante: [Julian Serralta]
 * Requerimiento: AYA-M04-RF03 y AYA-M04-RF04 · Ingreso de datos personales y validación
 * Casos de prueba: CP-003 (positivo) y CP-004 (negativo)
 */
describe("M04 - Ingreso de datos personales y validaciones en la reserva", () => {
  const ERROR_EMAIL = "Ingresá un email válido, por ejemplo nombre@correo.com";

  beforeEach(() => {
    // Arrange: Preparamos el flujo simulando que el usuario ya eligió un evento y horario,
    // y se encuentra en el paso "Tus datos" con el contador activo según los prerrequisitos.
    cy.viewport(1280, 720);
    cy.visit("/reserva/datos"); // Ajustar la ruta pública según las rutas de tu proyecto
  });

  it("CP-003: Ingresar datos personales válidos y confirmar la reserva exitosamente", () => {
    // Act: Paso 1 - Verificar pantalla inicial del paso
    cy.get(".summary-info").should("contain.text", "Consulta general");
    cy.get(".banner-guarantee").should("contain.text", "Te guardamos este horario por");
    cy.get("button[data-cy='confirm-reservation']").should("be.disabled")
      .and("contain.text", "Completá tus datos para confirmar.");

    // Act: Paso 2 y 3 - Ingresar nombre, apellido y email válidos
    cy.get("input[data-cy='input-nombre']").clear().type("Juan");
    cy.get("input[data-cy='input-apellido']").clear().type("Hernandez");
    cy.get("input[data-cy='input-email']").clear().type("JHernandez@gmail.com");
    cy.get(".error-message").should("not.exist");

    // Act: Paso 4 - Ingresar teléfono válido (incluyendo espacios permitidos)
    cy.get("input[data-cy='input-telefono']").clear().type("54 9 261 846 7920");
    
    // Assert: El botón de confirmar se habilita y cambia su texto
    cy.get("button[data-cy='confirm-reservation']")
      .should("not.be.disabled")
      .and("not.contain.text", "Completá tus datos para confirmar.");

    // Act: Paso 5 - Hacer click en "Confirmar reserva"
    cy.get("button[data-cy='confirm-reservation']").click();

    // Assert: Se muestra el comprobante de éxito con los datos correctos
    cy.get(".success-receipt").should("be.visible").and("contain.text", "¡Reserva confirmada!");
    cy.get(".success-receipt").should("contain.text", "Consulta general");
    cy.get(".success-receipt").should("contain.text", "Juan Hernandez");
  });

  it("CP-004: Rechazar un email sin '@' en los datos personales", () => {
    // Act: Paso 1 y 2 - Ingresar nombre, apellido y un email inválido (sin '@')
    cy.get("input[data-cy='input-nombre']").clear().type("Juan");
    cy.get("input[data-cy='input-apellido']").clear().type("Hernandez");
    cy.get("input[data-cy='input-email']").clear().type("JHernandez.gmail.com");
    
    // Act: Salir del campo email haciendo foco en teléfono (blur)
    cy.get("input[data-cy='input-telefono']").click();

    // Assert: El sistema muestra el mensaje de error en rojo debajo del email
    cy.get("input[data-cy='input-email']").parent().find(".error-message")
      .should("be.visible")
      .and("contain.text", ERROR_EMAIL);

    // Act: Paso 3 - Ingresar el teléfono
    cy.get("input[data-cy='input-telefono']").clear().type("54 9 261 846 7920");

    // Assert: El botón de confirmar sigue deshabilitado
    cy.get("button[data-cy='confirm-reservation']").should("be.disabled");

    // Act: Paso 4 - Intentar hacer clic en "Confirmar reserva"
    cy.get("button[data-cy='confirm-reservation']").click({ force: true });

    // Assert: El sistema permanece en el mismo paso y no registra nada
    cy.url().should("include", "/reserva/datos");
    cy.get(".success-receipt").should("not.exist");
  });
});
