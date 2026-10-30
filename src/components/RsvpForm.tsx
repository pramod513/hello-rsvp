"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitRsvp } from "@/app/i/[slug]/actions";
import type { ActionResult, RsvpStatus } from "@/lib/types";

export function RsvpForm({
  slug,
  token,
  isKnownGuest,
  initialName,
  initialStatus,
  initialPartySize,
  initialAnswer,
  initialNote,
  allowPlusOnes,
  maxPartySize,
  customQuestion,
}: {
  slug: string;
  token: string | null;
  isKnownGuest: boolean;
  initialName: string;
  initialStatus: RsvpStatus;
  initialPartySize: number;
  initialAnswer: string;
  initialNote: string;
  allowPlusOnes: boolean;
  maxPartySize: number;
  customQuestion: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(submitRsvp, null);
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus === "pending" ? null : initialStatus);
  const [party, setParty] = useState(Math.min(maxPartySize, Math.max(1, initialPartySize || 1)));
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hasReplied = initialStatus !== "pending";

  useEffect(() => {
    if (state && !state.ok) errorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="slug" value={slug} />
      {token ? <input type="hidden" name="token" value={token} /> : null}

      <fieldset className="fieldset">
        <legend className="sr-only">Will you come?</legend>
        <div className="reply-choices">
          {(
            [
              ["yes", "Yes, I'll be there"],
              ["maybe", "Maybe"],
              ["no", "Can't make it"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`reply-choice reply-choice-${value}`}>
              <input
                type="radio"
                name="status"
                value={value}
                checked={status === value}
                onChange={() => setStatus(value)}
                required
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {isKnownGuest ? (
        <p className="notice" style={{ marginTop: 20 }}>
          Replying as <strong>{initialName}</strong>. Not you? Ask the host for your own link.
        </p>
      ) : (
        <div className="field" style={{ marginTop: 20 }}>
          <label className="label" htmlFor="rsvp-name">
            Your first and last name
          </label>
          <input id="rsvp-name" name="name" className="input" maxLength={100} autoComplete="name" required />
        </div>
      )}

      {allowPlusOnes && status !== "no" ? (
        <div className="field" style={{ marginTop: 18 }}>
          <span className="label" id="party-label">
            How many people, including you?
          </span>
          <div className="party-stepper" role="group" aria-labelledby="party-label">
            <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} disabled={party <= 1} aria-label="One fewer">
              &minus;
            </button>
            <output aria-live="polite">{party}</output>
            <button
              type="button"
              onClick={() => setParty((p) => Math.min(maxPartySize, p + 1))}
              disabled={party >= maxPartySize}
              aria-label="One more"
            >
              +
            </button>
          </div>
          <input type="hidden" name="party_size" value={party} />
          <p className="hint">Up to {maxPartySize} per invite.</p>
        </div>
      ) : null}

      {customQuestion && status !== "no" ? (
        <div className="field" style={{ marginTop: 18 }}>
          <label className="label" htmlFor="rsvp-answer">
            {customQuestion}
          </label>
          <input id="rsvp-answer" name="answer" className="input" defaultValue={initialAnswer} maxLength={1000} />
        </div>
      ) : null}

      <div className="field" style={{ marginTop: 18 }}>
        <label className="label" htmlFor="rsvp-note">
          Message for the host <span className="label-optional">(optional)</span>
        </label>
        <textarea id="rsvp-note" name="note" className="textarea" style={{ minHeight: 80 }} defaultValue={initialNote} maxLength={1000} />
      </div>

      {state && !state.ok ? (
        <p ref={errorRef} tabIndex={-1} className="notice notice-error" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} disabled={pending || !status}>
        {pending ? "Sending…" : hasReplied ? "Update my reply" : "Send my reply"}
      </button>
    </form>
  );
}
