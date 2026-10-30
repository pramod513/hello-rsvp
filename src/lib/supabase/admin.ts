import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "./env";

/**
 * Server-only client that bypasses row level security.
 * Use it only in server code that serves guests (who have no account),
 * and always filter by slug or personal token before reading or writing.
 * Never import this file from a Client Component.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must only run on the server.");
  }
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
