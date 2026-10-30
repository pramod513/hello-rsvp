"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  addGuests,
  deleteGuest,
  markInvited,
  saveMessages,
  sendEmailInvites,
  updateGuest,
} from "@/app/dashboard/actions";
import { firstName, formatStamp, pluralize } from "@/lib/format";
import {
  DEFAULT_GROUP_MESSAGE,
  DEFAULT_INVITE_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  fillMessage,
  inviteLink,
  looksInternational,
  mailtoUrl,
  MESSAGE_PLACEHOLDERS,
  smsUrl,
  whatsappUrl,
} from "@/lib/share";
import type { ActionResult, GuestRow, RsvpStatus } from "@/lib/types";
import { parseGuestList } from "@/lib/validation";
import { ChatIcon, LinkIcon, MailIcon, TextIcon } from "./Icons";

type Channel = "whatsapp" | "sms" | "email" | "link";
type Kind = "invite" | "reminder";
type Filter = "all" | "yes" | "maybe" | "no" | "waiting" | "not_invited";

export interface ManagedEvent {
  id: string;
  slug: string;
  title: string;
  open_link: boolean;
  is_cancelled: boolean;
  invite_message: string | null;
  reminder_message: string | null;
  custom_question: string | null;
}

function statusLabel(g: GuestRow): { text: string; tone: RsvpStatus } {
  switch (g.status) {
    case "yes":
      return { text: g.party_size > 1 ? `Coming, party of ${g.party_size}` : "Coming", tone: "yes" };
    case "maybe":
      return { text: "Maybe", tone: "maybe" };
    case "no":
      return { text: "Can't come", tone: "no" };
    default:
      if (g.reminded_at) return { text: `Reminded ${formatStamp(g.reminded_at)}`, tone: "pending" };
      if (g.invited_at) return { text: `Invited ${formatStamp(g.invited_at)}`, tone: "pending" };
      return { text: "Not invited yet", tone: "pending" };
  }
}

function matches(g: GuestRow, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "waiting":
      return g.status === "pending" && Boolean(g.invited_at);
    case "not_invited":
      return g.status === "pending" && !g.invited_at;
    default:
      return g.status === filter;
  }
}

export function GuestManager({
  event,
  guests,
  baseUrl,
  emailEnabled,
  whenText,
}: {
  event: ManagedEvent;
  guests: GuestRow[];
  baseUrl: string;
  emailEnabled: boolean;
  whenText: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const inviteTemplate = event.invite_message || DEFAULT_INVITE_MESSAGE;
  const reminderTemplate = event.reminder_message || DEFAULT_REMINDER_MESSAGE;
  const groupLink = inviteLink(baseUrl, event.slug);

  const counts = useMemo(() => {
    let people = 0;
    const c = { yes: 0, maybe: 0, no: 0, waiting: 0, not_invited: 0 };
    for (const g of guests) {
      if (g.status === "yes") {
        c.yes++;
        people += g.party_size;
      } else if (g.status === "maybe") c.maybe++;
      else if (g.status === "no") c.no++;
      else if (g.invited_at) c.waiting++;
      else c.not_invited++;
    }
    return { ...c, people };
  }, [guests]);

  const visible = guests.filter(
    (g) => matches(g, filter) && (!search || g.name.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const notInvited = guests.filter((g) => g.status === "pending" && !g.invited_at);
  const waiting = guests.filter((g) => g.status === "pending" && g.invited_at);
  const nextWhatsApp = notInvited.find((g) => g.phone);
  const whatsappLeft = notInvited.filter((g) => g.phone).length;
  const emailInviteIds = notInvited.filter((g) => g.email).map((g) => g.id);
  const emailReminderIds = waiting.filter((g) => g.email).map((g) => g.id);

  function kindFor(g: GuestRow): Kind {
    return g.invited_at && g.status === "pending" ? "reminder" : "invite";
  }

  function messageFor(g: GuestRow, kind: Kind): string {
    return fillMessage(kind === "reminder" ? reminderTemplate : inviteTemplate, {
      name: firstName(g.name),
      event: event.title,
      date: whenText,
      link: inviteLink(baseUrl, event.slug, g.token),
    });
  }

  function run(task: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await task();
      setNotice(result.ok && !result.message ? null : result);
    });
  }

  function record(ids: string[], channel: Channel, kind: Kind) {
    startTransition(async () => {
      const result = await markInvited(ids, channel, kind);
      if (!result.ok) setNotice(result);
    });
  }

  function sendWhatsApp(g: GuestRow) {
    const kind = kindFor(g);
    window.open(whatsappUrl(g.phone, messageFor(g, kind)), "_blank", "noopener,noreferrer");
    record([g.id], "whatsapp", kind);
  }

  function sendText(g: GuestRow) {
    const kind = kindFor(g);
    window.location.href = smsUrl(g.phone, messageFor(g, kind));
    record([g.id], "sms", kind);
  }

  function sendEmail(g: GuestRow) {
    const kind = kindFor(g);
    if (emailEnabled) {
      run(() => sendEmailInvites(event.id, [g.id], kind));
      return;
    }
    const subject = kind === "reminder" ? `Reminder: ${event.title}` : `You're invited: ${event.title}`;
    window.location.href = mailtoUrl(g.email, subject, messageFor(g, kind));
    record([g.id], "email", kind);
  }

  async function copyLink(g: GuestRow) {
    const link = inviteLink(baseUrl, event.slug, g.token);
    try {
      await navigator.clipboard.writeText(link);
      setNotice({ ok: true, message: `Copied ${firstName(g.name)}'s personal link.` });
      if (!g.invited_at) record([g.id], "link", "invite");
    } catch {
      setNotice({ ok: false, error: `Copy didn't work in this browser. Here's the link: ${link}` });
    }
  }

  async function copyGroupLink() {
    try {
      await navigator.clipboard.writeText(groupLink);
      setNotice({ ok: true, message: "Invite link copied. Paste it into your group chat." });
    } catch {
      setNotice({ ok: false, error: `Copy didn't work in this browser. Here's the link: ${groupLink}` });
    }
  }

  const disabledReason = event.is_cancelled ? "This event is cancelled, so sending is turned off." : null;

  return (
    <div className="manage-grid">
      <div>
        <div className="stat-row" role="group" aria-label="Filter guests by reply">
          {(
            [
              ["yes", counts.people, counts.people === 1 ? "Person coming" : "People coming"],
              ["maybe", counts.maybe, "Maybe"],
              ["no", counts.no, "Can't come"],
              ["waiting", counts.waiting, "Waiting for a reply"],
              ["not_invited", counts.not_invited, "Not invited yet"],
            ] as const
          ).map(([key, value, label]) => (
            <button
              key={key}
              type="button"
              className={`stat stat-${key === "waiting" || key === "not_invited" ? "pending" : key}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(filter === key ? "all" : key)}
            >
              <span className="stat-number">{value}</span>
              <span className="stat-label">{label}</span>
            </button>
          ))}
        </div>

        {notice ? (
          <p
            className={`notice ${notice.ok ? "notice-success" : "notice-error"}`}
            role={notice.ok ? "status" : "alert"}
            style={{ marginBottom: 16 }}
          >
            {notice.ok ? notice.message : notice.error}
          </p>
        ) : null}

        <section className="guest-table" aria-labelledby="guest-list-title">
          <div className="guest-table-head row-between">
            <h2 id="guest-list-title" style={{ fontSize: 22 }}>
              {filter === "all" ? "Guests" : "Filtered guests"}{" "}
              <span className="faint small" style={{ fontFamily: "var(--font-body)" }}>
                {visible.length} of {guests.length}
              </span>
            </h2>
            <div className="row">
              {guests.length > 8 ? (
                <>
                  <label className="sr-only" htmlFor="guest-search">
                    Search guests
                  </label>
                  <input
                    id="guest-search"
                    className="input"
                    style={{ minHeight: 36, padding: "6px 10px", maxWidth: 200 }}
                    placeholder="Search by name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </>
              ) : null}
              {filter !== "all" ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter("all")}>
                  Show everyone
                </button>
              ) : null}
              {guests.length > 0 ? (
                <a className="btn btn-sm" href={`/dashboard/events/${event.id}/guests.csv`} download>
                  Download CSV
                </a>
              ) : null}
            </div>
          </div>

          {guests.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center" }}>
              <p style={{ fontWeight: 600 }}>No guests yet</p>
              <p className="muted" style={{ marginTop: 6 }}>
                Add the people you&rsquo;re inviting, or share one invite link in a group chat.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <p className="muted" style={{ padding: "28px 20px", textAlign: "center" }}>
              No guests match this filter.
            </p>
          ) : (
            visible.map((g) => {
              const status = statusLabel(g);
              const kind = kindFor(g);
              const verb = kind === "reminder" ? "Remind" : "Send";
              return (
                <div className="guest-row" key={g.id}>
                  <div>
                    <div className="guest-name">
                      {g.name}
                      {g.source === "link" ? <span className="faint small"> (replied from the shared link)</span> : null}
                    </div>
                    <div className="guest-contact">
                      {[g.email, g.phone].filter(Boolean).join(", ") || "No contact details"}
                      {g.phone && !looksInternational(g.phone) ? (
                        <span style={{ color: "#7a5800" }}> Add the country code for WhatsApp.</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="guest-status">
                    <span className={`status status-${status.tone}`}>{status.text}</span>
                  </div>

                  {g.answer || g.note ? (
                    <div className="guest-reply">
                      {g.answer && event.custom_question ? (
                        <p>
                          <strong>{event.custom_question}</strong> {g.answer}
                        </p>
                      ) : null}
                      {g.note ? <p>&ldquo;{g.note}&rdquo;</p> : null}
                    </div>
                  ) : null}

                  {editingId === g.id ? (
                    <GuestEditor
                      guest={g}
                      pending={pending}
                      onCancel={() => setEditingId(null)}
                      onSave={(input) =>
                        run(async () => {
                          const r = await updateGuest(g.id, input);
                          if (r.ok) setEditingId(null);
                          return r;
                        })
                      }
                      onDelete={() => {
                        if (window.confirm(`Remove ${g.name} from the guest list? Their reply is deleted too.`)) {
                          run(() => deleteGuest(g.id));
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <div className="guest-actions" aria-label={`Actions for ${g.name}`}>
                      {g.phone ? (
                        <>
                          <button type="button" className="btn btn-sm" onClick={() => sendWhatsApp(g)} disabled={Boolean(disabledReason)}>
                            <ChatIcon size={16} /> {verb} on WhatsApp
                          </button>
                          <button type="button" className="btn btn-sm" onClick={() => sendText(g)} disabled={Boolean(disabledReason)}>
                            <TextIcon size={16} /> {verb} a text
                          </button>
                        </>
                      ) : null}
                      {g.email ? (
                        <button type="button" className="btn btn-sm" onClick={() => sendEmail(g)} disabled={pending || Boolean(disabledReason)}>
                          <MailIcon size={16} /> {verb} an email
                        </button>
                      ) : null}
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => copyLink(g)}>
                        <LinkIcon size={16} /> Copy link
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingId(g.id)}>
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      <div className="side-stack">
        {disabledReason ? (
          <p className="notice notice-warning" role="status">
            {disabledReason}
          </p>
        ) : null}

        <AddGuests eventId={event.id} pending={pending} run={run} />

        <section className="panel" aria-labelledby="send-all-title">
          <h2 id="send-all-title" className="panel-title">
            Send to everyone
          </h2>
          <p className="hint" style={{ marginBottom: 14 }}>
            WhatsApp and texts open on your phone or computer with the message ready, one guest at a time.
          </p>
          <div className="stack-tight">
            <button
              type="button"
              className="btn btn-block"
              disabled={!nextWhatsApp || Boolean(disabledReason)}
              onClick={() => nextWhatsApp && sendWhatsApp(nextWhatsApp)}
            >
              <ChatIcon size={18} />
              {nextWhatsApp
                ? `WhatsApp ${firstName(nextWhatsApp.name)} (${whatsappLeft} to go)`
                : "Everyone with a phone is invited"}
            </button>
            {emailEnabled ? (
              <>
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={emailInviteIds.length === 0 || pending || Boolean(disabledReason)}
                  onClick={() => run(() => sendEmailInvites(event.id, emailInviteIds, "invite"))}
                >
                  <MailIcon size={18} />
                  {emailInviteIds.length ? `Email ${pluralize(emailInviteIds.length, "invite")}` : "No uninvited guests with email"}
                </button>
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={emailReminderIds.length === 0 || pending || Boolean(disabledReason)}
                  onClick={() => run(() => sendEmailInvites(event.id, emailReminderIds, "reminder"))}
                >
                  <MailIcon size={18} />
                  {emailReminderIds.length
                    ? `Email ${pluralize(emailReminderIds.length, "reminder")} to people who haven't replied`
                    : "No one to remind by email"}
                </button>
              </>
            ) : (
              <p className="hint">Email buttons open your own email app with the invite written for you.</p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="group-link-title">
          <h2 id="group-link-title" className="panel-title">
            One link for a group
          </h2>
          {event.open_link ? (
            <>
              <p className="hint" style={{ marginBottom: 12 }}>
                Anyone with this link can reply and is added to your list automatically.
              </p>
              <div className="copy-field">
                <label className="sr-only" htmlFor="group-link">
                  Invite link
                </label>
                <input id="group-link" className="input" readOnly value={groupLink} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="btn" onClick={copyGroupLink}>
                  Copy
                </button>
              </div>
              <a
                className="btn btn-block"
                style={{ marginTop: 10 }}
                href={whatsappUrl(null, fillMessage(DEFAULT_GROUP_MESSAGE, { event: event.title, date: whenText, link: groupLink }))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ChatIcon size={18} /> Share in a WhatsApp group
              </a>
            </>
          ) : (
            <p className="hint">
              Only guests you add can reply right now. To share one link in a group chat, turn on &ldquo;Anyone with
              the link can reply&rdquo; under Edit invite.
            </p>
          )}
        </section>

        <MessageEditor
          eventId={event.id}
          invite={inviteTemplate}
          reminder={reminderTemplate}
          pending={pending}
          run={run}
        />
      </div>
    </div>
  );
}

function AddGuests({
  eventId,
  pending,
  run,
}: {
  eventId: string;
  pending: boolean;
  run: (task: () => Promise<ActionResult>) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [list, setList] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function addOne(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setLocalError("Enter the guest's name.");
      return;
    }
    setLocalError(null);
    run(async () => {
      const r = await addGuests(eventId, [{ name, email: email || null, phone: phone || null }]);
      if (r.ok) {
        setName("");
        setEmail("");
        setPhone("");
      }
      return r;
    });
  }

  function addMany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { guests, skipped } = parseGuestList(list);
    if (guests.length === 0) {
      setLocalError("Put one guest on each line, starting with their name.");
      return;
    }
    setLocalError(null);
    run(async () => {
      const r = await addGuests(eventId, guests);
      if (r.ok) {
        setList(skipped.join("\n"));
        if (skipped.length) {
          return { ok: true, message: `${r.message} ${skipped.length} lines had no name and were left in the box.` };
        }
      }
      return r;
    });
  }

  return (
    <section className="panel" aria-labelledby="add-guests-title">
      <h2 id="add-guests-title" className="panel-title">
        Add guests
      </h2>
      <form onSubmit={addOne} noValidate style={{ marginTop: 12 }}>
        <div className="field">
          <label className="label" htmlFor="guest-name">
            Name
          </label>
          <input id="guest-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="off" />
        </div>
        <div className="field">
          <label className="label" htmlFor="guest-phone">
            Mobile number <span className="label-optional">(for WhatsApp or text)</span>
          </label>
          <input
            id="guest-phone"
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 312 555 0182"
            autoComplete="off"
          />
          <p className="hint">Start with + and the country code.</p>
        </div>
        <div className="field">
          <label className="label" htmlFor="guest-email">
            Email <span className="label-optional">(optional)</span>
          </label>
          <input id="guest-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        {localError ? (
          <p className="notice notice-error" role="alert" style={{ marginTop: 12 }}>
            {localError}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={pending}>
          Add guest
        </button>
      </form>

      <details className="disclosure" style={{ marginTop: 18 }}>
        <summary>Paste a list instead</summary>
        <form onSubmit={addMany} noValidate style={{ marginTop: 12 }}>
          <label className="label" htmlFor="guest-list">
            One guest per line
          </label>
          <textarea
            id="guest-list"
            className="textarea"
            style={{ minHeight: 140, marginTop: 6 }}
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={"Sofia Martinez, sofia@example.com\nRavi Iyer, +91 98450 12345\nTom Becker"}
          />
          <p className="hint" style={{ marginTop: 6 }}>
            Name first, then an email or phone number if you have one, separated by commas.
          </p>
          <button type="submit" className="btn btn-block" style={{ marginTop: 12 }} disabled={pending}>
            Add these guests
          </button>
        </form>
      </details>
    </section>
  );
}

function GuestEditor({
  guest,
  pending,
  onSave,
  onCancel,
  onDelete,
}: {
  guest: GuestRow;
  pending: boolean;
  onSave: (input: { name: string; email: string | null; phone: string | null; status: RsvpStatus; party_size: number }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email ?? "");
  const [phone, setPhone] = useState(guest.phone ?? "");
  const [status, setStatus] = useState<RsvpStatus>(guest.status);
  const [party, setParty] = useState(Math.max(1, guest.party_size));
  const idp = `edit-${guest.id}`;

  return (
    <form
      className="guest-edit"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, email: email || null, phone: phone || null, status, party_size: party });
      }}
    >
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor={`${idp}-name`}>
            Name
          </label>
          <input id={`${idp}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${idp}-phone`}>
            Mobile number
          </label>
          <input id={`${idp}-phone`} className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${idp}-email`}>
            Email
          </label>
          <input id={`${idp}-email`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor={`${idp}-status`}>
            Reply
          </label>
          <select id={`${idp}-status`} className="select" value={status} onChange={(e) => setStatus(e.target.value as RsvpStatus)}>
            <option value="pending">No reply yet</option>
            <option value="yes">Coming</option>
            <option value="maybe">Maybe</option>
            <option value="no">Can&apos;t come</option>
          </select>
          <p className="hint">Set this if they answered you in person or in a chat.</p>
        </div>
        {status !== "no" ? (
          <div className="field">
            <label className="label" htmlFor={`${idp}-party`}>
              Party size
            </label>
            <input
              id={`${idp}-party`}
              className="input"
              type="number"
              min={1}
              max={20}
              value={party}
              onChange={(e) => setParty(Number(e.target.value))}
            />
          </div>
        ) : null}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          Save guest
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: "auto" }} onClick={onDelete} disabled={pending}>
          Remove guest
        </button>
      </div>
    </form>
  );
}

function MessageEditor({
  eventId,
  invite,
  reminder,
  pending,
  run,
}: {
  eventId: string;
  invite: string;
  reminder: string;
  pending: boolean;
  run: (task: () => Promise<ActionResult>) => void;
}) {
  const [inviteText, setInviteText] = useState(invite);
  const [reminderText, setReminderText] = useState(reminder);

  return (
    <section className="panel">
      <details className="disclosure">
        <summary>Edit the message guests receive</summary>
        <form
          noValidate
          style={{ marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveMessages(eventId, { invite_message: inviteText, reminder_message: reminderText }));
          }}
        >
          <div className="field">
            <label className="label" htmlFor="invite-message">
              Invite message
            </label>
            <textarea id="invite-message" className="textarea" maxLength={1000} value={inviteText} onChange={(e) => setInviteText(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="reminder-message">
              Reminder message
            </label>
            <textarea
              id="reminder-message"
              className="textarea"
              maxLength={1000}
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
            />
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            These words are swapped in for each guest:
          </p>
          <div className="placeholder-list" style={{ marginTop: 6 }}>
            {MESSAGE_PLACEHOLDERS.map((p) => (
              <code key={p}>{p}</code>
            ))}
          </div>
          <button type="submit" className="btn btn-block" style={{ marginTop: 14 }} disabled={pending}>
            Save messages
          </button>
        </form>
      </details>
    </section>
  );
}
