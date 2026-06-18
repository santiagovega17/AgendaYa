import { describe, expect, it } from "vitest";
import { makeSlotId } from "./generateSlots";

describe("makeSlotId", () => {
  it("combina fecha, hora y tipo de evento en un id único", () => {
    expect(makeSlotId("2026-06-17", "09:00", "evt-1")).toBe(
      "2026-06-17_09:00_evt-1"
    );
  });
});
