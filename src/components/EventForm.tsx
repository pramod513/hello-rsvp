"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { saveEvent } from "@/app/dashboard/actions";
import { InviteCard } from "@/components/InviteCard";
import { randomId } from "@/lib/ids";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_BUCKET } from "@/lib/supabase/env";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import type { EventFormValues } from "@/lib/event-form";
import { EVENT_TYPES, type ActionResult } from "@/lib/types";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Shrinks large photos to 1600px on the long edge so invites load fast on phones. */
async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1_500_000 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85),
    );
  } catch {
    return file;
  }
}

export function EventForm({
  eventId,
  userId,
  initial,
  cancelHref,
}: {
  eventId?: string;
  userId: string;
  initial: EventFormValues;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveEvent, null);
  const [values, setValues] = useState<EventFormValues>(initial);
  const [timeZones, setTimeZones] = useState<string[]>([initial.timezone]);
  const [upload, setUpload] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const fileInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Time zone list and the host's own zone are only known in the browser.
  useEffect(() => {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      zones = [];
    }
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!eventId && browserZone) setValues((v) => (v.timezone === "UTC" ? { ...v, timezone: browserZone } : v));
    setTimeZones(Array.from(new Set(["UTC", initial.timezone, browserZone, ...zones].filter(Boolean))));
  }, [eventId, initial.timezone]);

  useEffect(() => {
    if (state && !state.ok) errorRef.current?.focus();
  }, [state]);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onText(key: keyof EventFormValues) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUpload({ busy: false, error: "Use a JPG, PNG, WebP or GIF image." });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUpload({ busy: false, error: "That photo is over 20 MB. Choose a smaller one." });
      return;
    }
    setUpload({ busy: true, error: null });
    const blob = await prepareImage(file);
    if (blob.size > MAX_UPLOAD_BYTES) {
      setUpload({ busy: false, error: "That image is still over 5 MB after resizing. Choose a smaller one." });
      return;
    }
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : blob.type === "image/gif" ? "gif" : "jpg";
    const path = `${userId}/${randomId(16)}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000", upsert: false });
    if (error) {
      setUpload({ busy: false, error: `The upload didn't finish: ${error.message}` });
      return;
    }
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    set("cover_image_url", data.publicUrl);
    setUpload({ busy: false, error: null });
  }

  const template = getTemplate(values.template);
  const previewEvent = {
    ...values,
    host_name: values.host_name || null,
    description: values.description || null,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
    location_name: values.location_name || null,
    location_address: values.location_address || null,
    online_url: values.online_url || null,
    cover_image_url: values.cover_image_url || null,
    is_cancelled: false,
  };

  return (
    <div className="builder">
      <form action={formAction} noValidate>
        {eventId ? <input type="hidden" name="id" value={eventId} /> : null}
        <input type="hidden" name="cover_image_url" value={values.cover_image_url} />

        <fieldset className="fieldset">
          <legend>The basics</legend>
          <div className="field">
            <label className="label" htmlFor="title">
              Event name
            </label>
            <input
              id="title"
              name="title"
              className="input"
              value={values.title}
              onChange={onText("title")}
              maxLength={120}
              placeholder="Priya turns 30"
              required
            />
          </div>
          <div className="field-row" style={{ marginTop: 18 }}>
            <div className="field">
              <label className="label" htmlFor="event_type">
                Kind of event
              </label>
              <select id="event_type" name="event_type" className="select" value={values.event_type} onChange={onText("event_type")}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="host_name">
                Hosted by <span className="label-optional">(optional)</span>
              </label>
              <input
                id="host_name"
                name="host_name"
                className="input"
                value={values.host_name}
                onChange={onText("host_name")}
                maxLength={80}
                placeholder="Anand and Meera"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>When</legend>
          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="event_date">
                Date
              </label>
              <input
                id="event_date"
                name="event_date"
                type="date"
                className="input"
                value={values.event_date}
                onChange={onText("event_date")}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="start_time">
                Starts <span className="label-optional">(optional)</span>
              </label>
              <input id="start_time" name="start_time" type="time" className="input" value={values.start_time} onChange={onText("start_time")} />
            </div>
            <div className="field">
              <label className="label" htmlFor="end_time">
                Ends <span className="label-optional">(optional)</span>
              </label>
              <input id="end_time" name="end_time" type="time" className="input" value={values.end_time} onChange={onText("end_time")} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label className="label" htmlFor="timezone">
              Time zone
            </label>
            <select id="timezone" name="timezone" className="select" value={values.timezone} onChange={onText("timezone")}>
              {timeZones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="hint">Guests see times in this zone, wherever they are.</p>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Where</legend>
          <div className="field">
            <label className="label" htmlFor="location_name">
              Place <span className="label-optional">(optional)</span>
            </label>
            <input
              id="location_name"
              name="location_name"
              className="input"
              value={values.location_name}
              onChange={onText("location_name")}
              maxLength={120}
              placeholder="Our place, or The Garden Room"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="location_address">
              Address <span className="label-optional">(optional)</span>
            </label>
            <input
              id="location_address"
              name="location_address"
              className="input"
              value={values.location_address}
              onChange={onText("location_address")}
              maxLength={300}
              placeholder="Street, city"
              autoComplete="street-address"
            />
            <p className="hint">Guests get a map link for this address.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="online_url">
              Online link <span className="label-optional">(optional)</span>
            </label>
            <input
              id="online_url"
              name="online_url"
              className="input"
              value={values.online_url}
              onChange={onText("online_url")}
              maxLength={500}
              inputMode="url"
              placeholder="https://meet.google.com/…"
            />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Message</legend>
          <div className="field">
            <label className="label" htmlFor="description">
              A note for your guests <span className="label-optional">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              className="textarea"
              value={values.description}
              onChange={onText("description")}
              maxLength={2000}
              placeholder="Join us for dinner, music and cake. Dress code: colorful!"
            />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Design</legend>
          <div className="template-grid" role="radiogroup" aria-label="Invite design">
            {TEMPLATES.map((t) => (
              <label key={t.id} className="template-option">
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={values.template === t.id}
                  onChange={() => set("template", t.id)}
                />
                <span
                  className="template-swatch"
                  style={{ background: t.swatch[0], color: t.swatch[1], borderBottom: `4px solid ${t.swatch[2]}` }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span className="template-name">{t.name}</span>
                <span className="template-desc">{t.description}</span>
              </label>
            ))}
          </div>

          <div className="field" style={{ marginTop: 24 }}>
            <span className="label" id="photo-label">
              Photo <span className="label-optional">(optional)</span>
            </span>
            <div className="upload" aria-labelledby="photo-label">
              {values.cover_image_url ? (
                <div className="upload-preview">
                  <img src={values.cover_image_url} alt="Invite photo" />
                </div>
              ) : null}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={onFile}
                className="sr-only"
                id="photo"
                tabIndex={-1}
              />
              <div className="row">
                <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()} disabled={upload.busy}>
                  {upload.busy ? "Uploading…" : values.cover_image_url ? "Change photo" : "Add a photo"}
                </button>
                {values.cover_image_url ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("cover_image_url", "")}>
                    Remove photo
                  </button>
                ) : null}
              </div>
              <p className="hint">JPG, PNG, WebP or GIF. Wide photos look best. Large photos are resized for you.</p>
              {upload.error ? (
                <p className="notice notice-error" role="alert">
                  {upload.error}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Replies</legend>
          <div className="field">
            <label className="label" htmlFor="rsvp_by">
              Ask for replies by <span className="label-optional">(optional)</span>
            </label>
            <input id="rsvp_by" name="rsvp_by" type="date" className="input" value={values.rsvp_by} onChange={onText("rsvp_by")} style={{ maxWidth: 240 }} />
            <p className="hint">After this date guests can still see the invite but can&rsquo;t change their reply.</p>
          </div>

          <div style={{ marginTop: 22 }}>
            <label className="check">
              <input
                type="checkbox"
                name="allow_plus_ones"
                checked={values.allow_plus_ones}
                onChange={(e) => set("allow_plus_ones", e.target.checked)}
              />
              <span>
                <strong>Guests can bring others</strong>
                <span className="hint" style={{ display: "block" }}>
                  They tell you how many people are in their party.
                </span>
              </span>
            </label>
            {values.allow_plus_ones ? (
              <div className="field" style={{ margin: "12px 0 18px 30px", maxWidth: 280 }}>
                <label className="label" htmlFor="max_party_size">
                  Largest party, including the guest
                </label>
                <input
                  id="max_party_size"
                  name="max_party_size"
                  type="number"
                  min={2}
                  max={20}
                  className="input"
                  value={values.max_party_size}
                  onChange={(e) => set("max_party_size", Number(e.target.value))}
                />
              </div>
            ) : null}
            <label className="check">
              <input type="checkbox" name="open_link" checked={values.open_link} onChange={(e) => set("open_link", e.target.checked)} />
              <span>
                <strong>Anyone with the link can reply</strong>
                <span className="hint" style={{ display: "block" }}>
                  Good for group chats. Turn off to accept replies only from guests you add.
                </span>
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="show_guest_list"
                checked={values.show_guest_list}
                onChange={(e) => set("show_guest_list", e.target.checked)}
              />
              <span>
                <strong>Show who&rsquo;s coming</strong>
                <span className="hint" style={{ display: "block" }}>
                  Guests see the first names of people who said yes, and nothing else.
                </span>
              </span>
            </label>
          </div>

          <div className="field" style={{ marginTop: 22 }}>
            <label className="label" htmlFor="custom_question">
              Ask guests a question <span className="label-optional">(optional)</span>
            </label>
            <input
              id="custom_question"
              name="custom_question"
              className="input"
              value={values.custom_question}
              onChange={onText("custom_question")}
              maxLength={200}
              placeholder="Any food allergies we should know about?"
            />
          </div>
        </fieldset>

        {state && !state.ok ? (
          <p ref={errorRef} tabIndex={-1} className="notice notice-error" role="alert" style={{ marginTop: 24 }}>
            {state.error}
          </p>
        ) : null}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={pending || upload.busy}>
            {pending ? "Saving…" : eventId ? "Save changes" : "Create invite"}
          </button>
          <Link href={cancelHref} className="btn btn-ghost btn-lg">
            Cancel
          </Link>
        </div>
      </form>

      <aside className="builder-preview" aria-label="Live preview">
        <p className="builder-preview-label">Preview, as your guests will see it</p>
        <div className="preview-surface" style={{ background: template.pageBackground }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <InviteCard event={previewEvent} headingLevel="h2" />
          </div>
        </div>
      </aside>
    </div>
  );
}
