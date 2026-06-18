import { addMinutes } from "date-fns";
import type { SlotLock } from "@/lib/types";

export const LOCK_DURATION_MINUTES = 15;
export const ABANDON_RELEASE_MS = 60_000;

export function createSlotLock(params: {
  slotId: string;
  eventTypeId: string;
  fecha: string;
  horaInicio: string;
  sessionId: string;
}): SlotLock {
  return {
    ...params,
    expiresAt: addMinutes(new Date(), LOCK_DURATION_MINUTES).toISOString(),
  };
}

export function cleanExpiredLocks(locks: SlotLock[]): SlotLock[] {
  const now = new Date();
  return locks.filter((l) => new Date(l.expiresAt) > now);
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("agendaya-session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("agendaya-session", id);
  }
  return id;
}
