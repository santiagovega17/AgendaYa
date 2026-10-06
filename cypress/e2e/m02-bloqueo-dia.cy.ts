import { diaHabil } from "../support/fechas";

/**
 * Integrante: Rosales Pedroza, Nicolás
 * Requerimiento: AYA-M02-RF03 · Bloqueo de días
 * Casos del TP5: CP-009 (positivo) y CP-010 (negativo)
 */
describe("M02 - Bloqueo de días", () => {
  const fecha = diaHabil(7);
  const motivo = "Capacitación";
  const captura = (nombre: string) => cy.screenshot(nombre, { capture: "viewport" });

  it("CP-009: bloquea un día sin reservas y deja de ofrecerlo en el enlace público", () => {
    // Arrange: agenda con horario Lun a Vie, sin reservas ni días bloqueados
    cy.prepararAgenda();
    cy.loginAdmin("/admin/dashboard");
    cy.dataCy("blocked-days-empty").should("be.visible");

    // Act: elegir el día, cargar el motivo y confirmar el bloqueo
    cy.dataCy("block-days-start").click();
    cy.dataCy("calendar-title").should("have.text", "Elegí los días a bloquear");
    cy.elegirDia(fecha);
    cy.dataCy("block-selected-count").should("have.text", "1 día seleccionado");
    cy.dataCy("block-reason").type(motivo);
    cy.dataCy("block-days-submit").click();
    cy.dataCy("block-confirm-dialog").should("be.visible").and("contain.text", `Motivo: ${motivo}`);
    cy.dataCy("block-confirm").click();

    // Assert: confirmación visible y el día aparece en la lista de bloqueados con su motivo
    cy.get("[data-sonner-toast]").should("contain.text", "Día bloqueado");
    cy.dataCy("block-confirm-dialog").should("not.exist");
    cy.dataCy("calendar-title").should("have.text", "Calendario");
    cy.dataCy("blocked-day")
      .should("have.length", 1)
      .and("have.attr", "data-fecha", fecha)
      .and("contain.text", motivo);
    captura("CP-009-1-dia-bloqueado");

    // Assert: en el enlace público el día ya no se puede elegir
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.dataCy("booking-step-datetime").should("be.visible");
    cy.mostrarDia(fecha).should("be.disabled");
    captura("CP-009-2-enlace-publico");
  });

  it("CP-010: no bloquea automáticamente un día con reservas confirmadas", () => {
    // Arrange: agenda con una reserva confirmada en el día a bloquear
    cy.prepararAgenda({
      reservas: [{ fecha, hora: "10:00", nombre: "Ana", apellido: "López", estado: "confirmada" }],
    });
    cy.loginAdmin("/admin/dashboard");

    // Act: intentar bloquear ese día
    cy.dataCy("block-days-start").click();
    cy.elegirDia(fecha);
    cy.dataCy("block-days-submit").click();
    cy.dataCy("block-confirm").click();

    // Assert: se listan los turnos afectados en lugar de bloquear el día
    cy.dataCy("block-conflict-dialog").should("be.visible").and("contain.text", "se cancelan 1 reserva");
    cy.dataCy("block-conflict-booking").should("have.length", 1).and("contain.text", "10:00 · Ana López");
    captura("CP-010-1-reservas-afectadas");

    // Act: desistir del bloqueo
    cy.dataCy("block-conflict-cancel").click();

    // Assert: el día sigue sin bloquear y la reserva sigue activa
    cy.dataCy("block-conflict-dialog").should("not.exist");
    cy.dataCy("block-days-exit").click();
    cy.dataCy("blocked-days-empty").should("be.visible");
    cy.elegirDia(fecha);
    cy.dataCy("day-summary").should("have.text", "1 turno");
    cy.dataCy("day-booking").should("have.length", 1).and("contain.text", "Ana López");
    captura("CP-010-2-dia-sin-bloquear");
  });
});
