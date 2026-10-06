/**
 * Ritmo "humano" para ver los tests en la ventana de Cypress: pausa después de cada clic y
 * tipeo tecla por tecla. Solo se activa con `cypress open`; `cypress run` y el CI van rápido.
 * E2E_DEMORA_MS en .env.local cambia la pausa (0 la desactiva, también en `cypress open`).
 */
const PAUSA_INTERACTIVA_MS = 700;
const MS_POR_TECLA = 90;

function pausaMs(): number {
  const configurada = Cypress.expose("DEMORA_MS");
  if (configurada !== undefined && configurada !== "") return Number(configurada);
  return Cypress.config("isInteractive") ? PAUSA_INTERACTIVA_MS : 0;
}

// Cypress acepta que un comando sobrescrito devuelva una promesa, pero sus tipos solo admiten Chainable.
const esperarDespues = (resultado: Cypress.Chainable, ms: number) =>
  (ms > 0 ? Cypress.Promise.resolve(resultado).delay(ms) : resultado) as Cypress.Chainable;

// La pausa va después de la acción: si fuera antes, React podría re-renderizar el elemento
// ya encontrado y Cypress fallaría con "element is detached from the DOM".
Cypress.Commands.overwrite<"click", "element">("click", (originalFn, subject, ...args) =>
  esperarDespues(originalFn(subject, ...args), pausaMs())
);

Cypress.Commands.overwrite<"type", "element">("type", (originalFn, subject, texto, opciones = {}) => {
  const ms = pausaMs();
  const conTipeo = ms > 0 ? { delay: MS_POR_TECLA, ...opciones } : opciones;
  return esperarDespues(originalFn(subject, texto, conTipeo), ms);
});

export {};
