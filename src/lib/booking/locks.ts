export const ABANDON_RELEASE_MS = 60_000;

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("agendaya-session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("agendaya-session", id);
  }
  return id;
}
