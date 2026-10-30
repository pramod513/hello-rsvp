import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { valuesFromEvent } from "@/lib/event-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create an invite" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/new");

  return (
    <>
      <Link href="/dashboard" className="back-link">
        Back to your events
      </Link>
      <div className="page-head">
        <div>
          <h1>Create an invite</h1>
          <p>Fill in what you know now. You can change anything later, even after sending.</p>
        </div>
      </div>
      <EventForm userId={user.id} initial={valuesFromEvent(null)} cancelHref="/dashboard" />
    </>
  );
}
