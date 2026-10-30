import { notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { EventSettings } from "@/components/EventSettings";
import { getHostEvent } from "@/lib/data";
import { valuesFromEvent } from "@/lib/event-form";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, event] = await Promise.all([getCurrentUser(), getHostEvent(id)]);
  if (!user) redirect("/login");
  if (!event) notFound();

  return (
    <>
      <EventForm
        eventId={event.id}
        userId={user.id}
        initial={valuesFromEvent(event)}
        cancelHref={`/dashboard/events/${event.id}`}
      />
      <EventSettings eventId={event.id} cancelled={event.is_cancelled} />
    </>
  );
}
