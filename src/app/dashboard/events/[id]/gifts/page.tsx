import { notFound } from "next/navigation";
import { GiftManager, type ManagedGift } from "@/components/GiftManager";
import { getHostEvent } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { GiftClaimRow, GiftItemRow } from "@/lib/types";

export default async function GiftsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getHostEvent(id);
  if (!event) notFound();

  const supabase = await createClient();
  const [{ data: items }, { data: claims }] = await Promise.all([
    supabase
      .from("gift_items")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("gift_claims").select("*").eq("event_id", event.id).order("created_at", { ascending: true }),
  ]);

  const claimRows = (claims ?? []) as GiftClaimRow[];
  const gifts: ManagedGift[] = ((items ?? []) as GiftItemRow[]).map((item) => ({
    ...item,
    claims: claimRows.filter((c) => c.gift_item_id === item.id),
  }));

  return <GiftManager eventId={event.id} eventType={event.event_type} showGifts={event.show_gifts} gifts={gifts} />;
}
