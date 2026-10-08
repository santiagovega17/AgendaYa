import { diaHabil } from "../support/fechas";

/**
 * Requerimiento: AYA-M04-RF06 · Validación de horarios expirados (US-M04-05 y US-M04-06)
 * Casos del TP5: CP-011 (positivo) y CP-012 (negativo)
 */
describe("M04 - Horarios vencidos", () => {
  // Los casos del TP5 corren "hoy a las 11:10": el reloj del navegador se fija en un día hábil
  // relativo para que los tests sigan sirviendo cuando pase la fecha original (19/10/2026).
  const fecha = diaHabil(7);
  const a = (hora: string) => new Date(`${fecha}T${hora}`);
  const VENCIDOS = ["09:00", "09:30", "10:00", "10:30", "11:00"];
  const horario = (hora: string) => cy.dataCy("slot-option").filter(`[data-hora="${hora}"]`);
  const captura = (nombre: string, desde = "slot-list") => {
    cy.dataCy(desde).scrollIntoView({ offset: { top: -90, left: 0 } });
    cy.screenshot(nombre, { capture: "viewport" });
  };

  const verHorariosDelDia = () => {
    cy.visit("/agenda/laura-perez");
    cy.dataCy("event-option").first().click();
    cy.elegirDia(fecha);
    cy.dataCy("slot-list").should("be.visible");
  };

  it("CP-011: permite seleccionar un horario futuro disponible", () => {
    // Arrange: agenda sin reservas, hoy a las 11:10, y el invitado viendo los horarios de hoy
    cy.prepararAgenda();
    cy.clock(a("11:10:00"), ["Date"]);
    verHorariosDelDia();
    horario("11:00").should("be.disabled").and("have.attr", "data-vencido", "true");
    horario("15:00").should("be.enabled").and("have.attr", "data-vencido", "false");

    // Act: elegir las 15:00
    horario("15:00").click();

    // Assert: el horario queda resaltado y el botón inferior muestra la selección
    horario("15:00").should("have.attr", "aria-pressed", "true");
    cy.dataCy("confirm-slot")
      .should("be.enabled")
      .and("contain.text", "Confirmar selección")
      .and("contain.text", "15:00");
    captura("CP-011-1-horario-elegido");

    // Act: confirmar la selección. La reserva temporal la vence el servidor con su hora real,
    // así que el navegador vuelve al reloj real para que la cuenta regresiva sea la verdadera.
    cy.clock().then((reloj) => reloj.restore());
    cy.dataCy("confirm-slot").click();

    // Assert: pasa a "Tus datos" con el horario guardado y la cuenta regresiva desde 15:00
    cy.dataCy("booking-step-guest").should("be.visible");
    cy.dataCy("guest-slot-summary").should("contain.text", "15:00 a 15:30 h");
    cy.dataCy("countdown-timer")
      .invoke("text")
      .then((inicial) => {
        expect(inicial).to.match(/^(15:00|14:5\d)$/);
        cy.dataCy("countdown-timer").should("not.have.text", inicial);
      });
    captura("CP-011-2-horario-guardado", "guest-slot-summary");
  });

  it("CP-012: impide seleccionar horarios vencidos y los actualiza cada 30 segundos", () => {
    // Arrange: agenda sin reservas, hoy a las 11:10, con el reloj y la actualización periódica controlados
    cy.prepararAgenda();
    cy.clock(a("11:10:00"), ["Date", "setInterval", "clearInterval"]);
    verHorariosDelDia();

    // Assert: los horarios anteriores a las 11:10 están vencidos y deshabilitados; desde las 11:30, no
    VENCIDOS.forEach((hora) => {
      horario(hora)
        .should("be.disabled")
        .and("have.attr", "data-vencido", "true")
        .and("have.attr", "aria-label", `${hora}, ya pasó`);
    });
    horario("11:30").should("be.enabled").and("have.attr", "data-vencido", "false");
    cy.dataCy("confirm-slot").should("be.disabled").and("have.text", "Elegí un horario");
    captura("CP-012-1-horarios-vencidos");

    // Act: intentar elegir las 09:00 y las 11:00 (vencida hace 10 minutos)
    horario("09:00").click({ force: true });
    horario("11:00").click({ force: true });

    // Assert: ninguno se selecciona y el botón sigue sin permitir avanzar
    horario("09:00").should("have.attr", "aria-pressed", "false");
    horario("11:00").should("have.attr", "aria-pressed", "false");
    cy.dataCy("confirm-slot").should("be.disabled").and("have.text", "Elegí un horario");

    // Act: seguir en la pantalla sin recargar hasta pasadas las 11:30
    cy.clock().then((reloj) => reloj.setSystemTime(a("11:29:50")));
    horario("11:30").should("be.enabled");
    cy.tick(30_000);

    // Assert: con la actualización automática, las 11:30 pasan a vencidas y las 12:00 siguen disponibles
    horario("11:30").should("be.disabled").and("have.attr", "data-vencido", "true");
    horario("12:00").should("be.enabled").and("have.attr", "data-vencido", "false");
    captura("CP-012-2-actualizacion-automatica");
  });
});
