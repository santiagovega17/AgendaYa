import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

let client: SupabaseClient<Database> | null = null;

// Se crea en el primer uso para que el build no falle si faltan las variables de entorno.
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example).");
    }
    client = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  }
  return client;
}
