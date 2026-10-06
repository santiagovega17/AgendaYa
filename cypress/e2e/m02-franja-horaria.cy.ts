import { format, nextMonday } from "date-fns";
import { es } from "date-fns/locale";
import { fechaStr } from "../support/fechas";

/**
 * Integrante: Moyano, Bruno Ezequiel
 * Requerimiento: AYA-M02-RF01 · Definición de disponibilidad laboral
 * Casos del TP5: CP-001 (positivo) y CP-002 (negativo)
 */
describe("M02 - Franjas horarias", () => {
  const DIAS_HABILES = [1, 2, 3, 4, 5];
  const FIN_ANTES_DE_INICIO = "El fin debe ser posterior al inicio.";
  const captura = (nombre: string, mostrar?: string) => {
    if (mostrar) cy.dataCy(mostrar).scrollIntoView({ offset: { top: -250, left: 0 } });
    cy.screenshot(nombre, { capture: "viewport" });
  };

  beforeEach(() => {
    // Arrange (común): agenda de test sin horario laboral y la pantalla Disponibilidad abierta
    cy.prepararAgenda({ conHorario: false });
    cy.loginAdmin("/admin/disponibilidad");
    cy.dataCy("settings-antelacionMinHoras").should("have.value", "0");
    cy.dataCy("week-day-off").should("have.length", 7);
    cy.dataCy("add-schedule-empty").should("be.visible");
  });

  it("CP-001: crea una franja horaria permanente válida", () => {
    // Arrange: fecha inicial = próximo lunes (en el TP5 era el 12/10/2026)
    const lunes = nextMonday(new Date());
    const fechaInicial = fechaStr(lunes);
    const fechaLarga = format(lunes, "EEEE d 'de' MMMM", { locale: es });
    const fechaCompacta = format(lunes, "EEE d MMM", { locale: es }).replace(/\./g, "");

    // Act: abrir el diálogo y cargar la franja de 07:00 a 15:00
    cy.dataCy("add-schedule").click();
    cy.dataCy("schedule-dialog").should("contain.text", "Agregar horario laboral");
    DIAS_HABILES.forEach((dia) => cy.dataCy(`schedule-day-${dia}`).should("have.attr", "data-state", "on"));
    cy.dataCy("schedule-start-0").should("have.value", "09:00").clear().type("07:00");
    cy.dataCy("schedule-end-0").should("have.value", "13:00").clear().type("15:00");
    cy.dataCy("schedule-end-error-0").should("not.exist");
    cy.dataCy("schedule-continue").click();

    // Act: elegir "Permanente" con la fecha inicial
    cy.dataCy("schedule-dialog").should("contain.text", "¿Cómo querés aplicar este horario?");
    cy.dataCy("schedule-type-once").should("be.visible");
    cy.dataCy("schedule-type-permanent").click().should("have.attr", "aria-checked", "true");
    cy.dataCy("schedule-start-date").clear().type(fechaInicial);
    cy.dataCy("schedule-start-date-hint").should("have.text", `Vigente desde el ${fechaLarga}.`);
    captura("CP-001-1-aplicar-permanente");
    cy.dataCy("schedule-save").click();

    // Assert: el diálogo se cierra y se confirma el guardado
    cy.dataCy("schedule-dialog").should("not.exist");
    cy.get("[data-sonner-toast]")
      .should("contain.text", "Horario guardado")
      .and("contain.text", `Se repite todas las semanas desde el ${fechaCompacta.toLowerCase()}.`);

    // Assert: aparece un único grupo "Lun a Vie · 07:00–15:00" que rige desde el lunes elegido
    cy.dataCy("schedule-group").should("have.length", 1).and("have.attr", "data-tipo", "permanent");
    cy.dataCy("schedule-group-days").should("have.text", "Lun a Vie");
    cy.dataCy("schedule-group-ranges").should("have.text", "07:00–15:00");
    cy.dataCy("schedule-group-status").should("have.text", `Desde ${fechaCompacta.charAt(0).toUpperCase()}${fechaCompacta.slice(1)}`);
    captura("CP-001-2-franja-guardada", "schedule-group");
  });

  it("CP-002: rechaza una franja horaria con hora de fin anterior a la de inicio", () => {
    // Act: abrir el diálogo, cargar 07:00 a 03:00 y continuar
    cy.dataCy("add-schedule").click();
    DIAS_HABILES.forEach((dia) => cy.dataCy(`schedule-day-${dia}`).should("have.attr", "data-state", "on"));
    cy.dataCy("schedule-start-0").clear().type("07:00");
    cy.dataCy("schedule-end-0").clear().type("03:00");
    cy.dataCy("schedule-continue").click();

    // Assert: error debajo de la hora de fin y el diálogo no avanza
    cy.dataCy("schedule-end-error-0").should("be.visible").and("have.text", FIN_ANTES_DE_INICIO);
    cy.dataCy("schedule-dialog").should("contain.text", "Agregar horario laboral");
    cy.dataCy("schedule-type-permanent").should("not.exist");
    captura("CP-002-1-error-fin-antes-inicio");

    // Act: cancelar
    cy.dataCy("schedule-cancel").click();

    // Assert: no se guardó ningún horario
    cy.dataCy("schedule-dialog").should("not.exist");
    cy.dataCy("week-day-off").should("have.length", 7);
    cy.dataCy("schedule-group").should("not.exist");
    cy.dataCy("add-schedule-empty").should("be.visible");
    captura("CP-002-2-sin-horario", "add-schedule-empty");
  });
});
