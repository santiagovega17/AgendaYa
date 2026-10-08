import { describe, expect, it } from "vitest";
import { guestSchema } from "./guest";

const invitadoValido = {
  nombre: "Bruno",
  apellido: "Moyano",
  email: "bruno.moyano@test.com",
  telefono: "+54 11 1234-5678",
  nota: "Primera consulta",
};

describe("datos del invitado", () => {
  it("acepta los datos del invitado y rechaza el pedido si falta el apellido o el teléfono no es válido", () => {
    expect(guestSchema.safeParse(invitadoValido).success).toBe(true);

    const sinApellido = guestSchema.safeParse({ ...invitadoValido, apellido: "   " });
    expect(sinApellido.success).toBe(false);
    expect(sinApellido.error?.issues.map((issue) => issue.path.join("."))).toContain("apellido");

    const telefonoInvalido = guestSchema.safeParse({ ...invitadoValido, telefono: "abc" });
    expect(telefonoInvalido.success).toBe(false);
    expect(telefonoInvalido.error?.issues.map((issue) => issue.message)).toContain(
      "Ingresá un teléfono válido (solo números)",
    );
  });
});
