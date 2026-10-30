import { notFound } from "next/navigation";
import { GuestManager } from "@/components/GuestManager";
import { getHostEvent } from "@/lib/data";
import { emailEnabled } from "@/lib/email";
import { formatWhenOneLine } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { GuestRow } from "@/lib/types";

export default async function EventGuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const event = await getHostEvent(id);
  if (!event) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });
  const guests = (data ?? []) as GuestRow[];

  return (
    <>
      {flags.created ? (
        <p className="notice notice-success" role="status" style={{ marginBottom: 20 }}>
          Your invite is ready. Add your guests, then send it from here.
        </p>
      ) : null}
      {flags.saved ? (
        <p className="notice notice-success" role="status" style={{ marginBottom: 20 }}>
          Changes saved. Anyone who opens the invite sees the new version.
        </p>
      ) : null}
      {error ? (
        <p className="notice notice-error" role="alert" style={{ marginBottom: 20 }}>
          We couldn&rsquo;t load the guest list. Refresh the page to try again.
        </p>
      ) : null}
      <GuestManager
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          open_link: event.open_link,
          is_cancelled: event.is_cancelled,
          invite_message: event.invite_message,
          reminder_message: event.reminder_message,
          custom_question: event.custom_question,
        }}
        guests={guests}
        baseUrl={siteUrl()}
        emailEnabled={emailEnabled()}
        whenText={formatWhenOneLine(event)}
      />
    </>
  );
}
