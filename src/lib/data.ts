import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** One of the signed-in host's events (row level security limits it to their own). Cached per request. */
export const getHostEvent = cache(async (id: string): Promise<EventRow | null> => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return (data as EventRow | null) ?? null;
});
