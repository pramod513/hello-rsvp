"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteEvent, setEventCancelled } from "@/app/dashboard/actions";
import type { ActionResult } from "@/lib/types";

export function EventSettings({ eventId, cancelled }: { eventId: string; cancelled: boolean }) {
  const [deleteState, deleteAction, deleting] = useActionState<ActionResult | null, FormData>(deleteEvent, null);
  const [cancelResult, setCancelResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleCancelled() {
    startTransition(async () => {
      setCancelResult(await setEventCancelled(eventId, !cancelled));
    });
  }

  return (
    <section className="panel" style={{ marginTop: 40, maxWidth: 760 }} aria-labelledby="settings-title">
      <h2 id="settings-title" className="panel-title">
        Cancel or delete
      </h2>

      <div className="row-between" style={{ marginTop: 16 }}>
        <div style={{ maxWidth: "46ch" }}>
          <strong>{cancelled ? "This event is marked as cancelled" : "Cancel this event"}</strong>
          <p className="hint">
            {cancelled
              ? "Guests see a cancelled notice on the invite. Turn it back on if plans change."
              : "Guests see a cancelled notice on the invite and can no longer reply. You can undo this."}
          </p>
        </div>
        <button type="button" className={cancelled ? "btn" : "btn btn-danger"} onClick={toggleCancelled} disabled={pending}>
          {cancelled ? "Mark as happening" : "Mark as cancelled"}
        </button>
      </div>
      {cancelResult ? (
        <p className={`notice ${cancelResult.ok ? "notice-success" : "notice-error"}`} role="status" style={{ marginTop: 12 }}>
          {cancelResult.ok ? cancelResult.message : cancelResult.error}
        </p>
      ) : null}

      <form action={deleteAction} style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        <input type="hidden" name="id" value={eventId} />
        <strong>Delete this event</strong>
        <p className="hint" style={{ marginBottom: 12 }}>
          Removes the invite, every guest and reply, and the gift list. Guests&rsquo; links stop working. This can&rsquo;t be undone.
        </p>
        <div className="row">
          <label className="sr-only" htmlFor="confirm-delete">
            Type delete to confirm
          </label>
          <input
            id="confirm-delete"
            name="confirm"
            className="input"
            placeholder='Type "delete" to confirm'
            autoComplete="off"
            style={{ maxWidth: 260 }}
          />
          <button type="submit" className="btn btn-danger" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete event"}
          </button>
        </div>
        {deleteState && !deleteState.ok ? (
          <p className="notice notice-error" role="alert" style={{ marginTop: 12 }}>
            {deleteState.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
