import type { AgendaPreparada, Escenario } from "../tasks/prepararAgenda";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Atajo para `cy.get('[data-cy="..."]')`. */
      dataCy(valor: string): Chainable<JQuery<HTMLElement>>;
      /** Resetea la agenda del administrador de test y carga el escenario indicado. */
      prepararAgenda(escenario?: Escenario): Chainable<AgendaPreparada>;
      /** Inicia sesión como administrador de test y deja abierta la ruta indicada del panel. */
      loginAdmin(ruta?: string): Chainable<void>;
      /** Navega el calendario visible hasta el mes de `fecha` (yyyy-MM-dd) y hace clic en ese día. */
      elegirDia(fecha: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("dataCy", (valor: string) => cy.get(`[data-cy="${valor}"]`));

Cypress.Commands.add("prepararAgenda", (escenario: Escenario = {}) =>
  cy.task<AgendaPreparada>("prepararAgenda", escenario, { log: true })
);

// Los clics que llegan antes de que React hidrate el HTML del servidor se pierden.
const hidratado = ($el: JQuery<HTMLElement>) => {
  expect(
    Object.keys($el[0]).some((k) => k.startsWith("__react")),
    "elemento hidratado por React"
  ).to.eq(true);
};

Cypress.Commands.add("loginAdmin", (ruta = "/admin/dashboard") => {
  cy.env<{ ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string }>(["ADMIN_EMAIL", "ADMIN_PASSWORD"], { log: false }).then(
    ({ ADMIN_EMAIL: email, ADMIN_PASSWORD: password }) => {
      if (!email || !password) {
        throw new Error("Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.local (ver README).");
      }
      cy.session(
        email,
        () => {
          cy.visit("/admin/login");
          cy.dataCy("login-email").should(hidratado).type(email);
          cy.dataCy("login-password").type(password, { log: false });
          cy.dataCy("login-submit").click();
          cy.dataCy("dashboard-page").should("be.visible");
        },
        {
          validate() {
            cy.window()
              .its("localStorage")
              .then((ls: Storage) => {
                expect(Object.keys(ls).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))).to.eq(true);
              });
          },
        }
      );
      cy.visit(ruta);
    }
  );
});

Cypress.Commands.add("elegirDia", (fecha: string) => {
  const selector = `[data-cy="calendar-day"][data-fecha="${fecha}"]`;
  const buscar = (intentos: number): void => {
    cy.get("body").then(($body) => {
      if ($body.find(selector).length > 0) {
        cy.get(selector).click();
      } else if (intentos > 0) {
        cy.dataCy("calendar-next").click();
        buscar(intentos - 1);
      } else {
        throw new Error(`El día ${fecha} no aparece en el calendario.`);
      }
    });
  };
  buscar(12);
});

export {};
