import { existsSync } from "node:fs";
import { defineConfig } from "cypress";
import { prepararAgenda, type Escenario } from "./cypress/tasks/prepararAgenda";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000,
    video: false,
    screenshotOnRunFailure: true,
    env: {
      ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
    },
    setupNodeEvents(on) {
      on("task", {
        prepararAgenda: (escenario: Escenario = {}) => prepararAgenda(escenario),
      });
    },
  },
});
