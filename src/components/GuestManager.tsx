"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  addGuests,
  deleteAllGuests,
  deleteGuest,
  markInvited,
  saveMessages,
  updateGuest,
} from "@/app/dashboard/actions";
import { firstName, formatStamp, pluralize } from "@/lib/format";
import {
  DEFAULT_GROUP_MESSAGE,
  DEFAULT_INVITE_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  fillMessage,
  inviteLink,
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
  whenText,
}: {
  event: ManagedEvent;
  guests: GuestRow[];
  baseUrl: string;
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
  const nextGuest = notInvited[0] ?? null;

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

  function record(g: GuestRow, channel: Channel, kind: Kind) {
    startTransition(async () => {
      const result = await markInvited([g.id], channel, kind);
      if (!result.ok) setNotice(result);
    });
  }

  // Each button opens the host's own app with the message written. The host
  // picks the contact there, so Hello RSVP never sees a phone number or email.
  function send(g: GuestRow, channel: "whatsapp" | "sms" | "email") {
    const kind = kindFor(g);
    const message = messageFor(g, kind);
    if (channel === "whatsapp") {
      window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
    } else if (channel === "sms") {
      window.location.href = smsUrl(message);
    } else {
      const subject = kind === "reminder" ? `Reminder: ${event.title}` : `You're invited: ${event.title}`;
      window.location.href = mailtoUrl(subject, message);
    }
    setNotice({ ok: true, message: `Pick ${firstName(g.name)} in the app that opened, then send.` });
    record(g, channel, kind);
  }

  async function copyLink(g: GuestRow) {
    const link = inviteLink(baseUrl, event.slug, g.token);
    try {
      await navigator.clipboard.writeText(link);
      setNotice({ ok: true, message: `Copied ${firstName(g.name)}'s private link.` });
      if (!g.invited_at) record(g, "link", "invite");
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

  const sendingOff = event.is_cancelled;

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
                Add the names of the people you&rsquo;re inviting, or share one invite link in a group chat.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <p className="muted" style={{ padding: "28px 20px", textAlign: "center" }}>
              No guests match this filter.
            </p>
          ) : (
            visible.map((g) => {
              const status = statusLabel(g);
              const remind = kindFor(g) === "reminder";
              return (
                <div className="guest-row" key={g.id}>
                  <div>
                    <div className="guest-name">{g.name}</div>
                    {g.source === "link" ? <div className="guest-contact">Replied from the shared link</div> : null}
                  </div>
                  <div className="guest-status">
                    <span className={`status status-${status.tone}`}>{status.text}</span>
                    {editingId !== g.id ? (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingId(g.id)} aria-label={`Edit ${g.name}`}>
                        Edit
                      </button>
                    ) : null}
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
                    <div className="guest-actions" aria-label={`Send to ${g.name}`}>
                      <button type="button" className="btn btn-sm" onClick={() => send(g, "whatsapp")} disabled={sendingOff}>
                        <ChatIcon size={16} /> {remind ? "Remind on WhatsApp" : "WhatsApp"}
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => send(g, "sms")} disabled={sendingOff}>
                        <TextIcon size={16} /> {remind ? "Remind by text" : "Text"}
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => send(g, "email")} disabled={sendingOff}>
                        <MailIcon size={16} /> {remind ? "Remind by email" : "Email"}
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => copyLink(g)}>
                        <LinkIcon size={16} /> Copy link
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
        <p className="hint" style={{ marginTop: 12 }}>
          Each guest gets a private link. When they reply, it&rsquo;s saved against their name automatically.
        </p>
      </div>

      <div className="side-stack">
        {sendingOff ? (
          <p className="notice notice-warning" role="status">
            This event is cancelled, so sending is turned off.
          </p>
        ) : null}

        <AddGuests eventId={event.id} pending={pending} run={run} />

        <section className="panel" aria-labelledby="send-next-title">
          <h2 id="send-next-title" className="panel-title">
            Send to the next guest
          </h2>
          {nextGuest ? (
            <>
              <p className="hint" style={{ marginBottom: 14 }}>
                Next is <strong>{nextGuest.name}</strong> ({pluralize(notInvited.length, "guest")} not invited yet). Your app
                opens with their private link in the message; pick them as the contact and send.
              </p>
              <div className="stack-tight">
                <button type="button" className="btn btn-block" disabled={sendingOff} onClick={() => send(nextGuest, "whatsapp")}>
                  <ChatIcon size={18} /> WhatsApp {firstName(nextGuest.name)}
                </button>
                <button type="button" className="btn btn-block" disabled={sendingOff} onClick={() => send(nextGuest, "sms")}>
                  <TextIcon size={18} /> Text {firstName(nextGuest.name)}
                </button>
                <button type="button" className="btn btn-block" disabled={sendingOff} onClick={() => send(nextGuest, "email")}>
                  <MailIcon size={18} /> Email {firstName(nextGuest.name)}
                </button>
              </div>
            </>
          ) : (
            <p className="hint">{guests.length ? "Everyone on your list has been invited." : "Add guests to start sending."}</p>
          )}
        </section>

        <section className="panel" aria-labelledby="group-link-title">
          <h2 id="group-link-title" className="panel-title">
            One link for a group
          </h2>
          {event.open_link ? (
            <>
              <p className="hint" style={{ marginBottom: 12 }}>
                Anyone with this link can reply. They type their name, and it&rsquo;s added to your list.
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
                href={whatsappUrl(fillMessage(DEFAULT_GROUP_MESSAGE, { event: event.title, date: whenText, link: groupLink }))}
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

        {guests.length > 0 ? (
          <section className="panel" aria-labelledby="clear-list-title">
            <h2 id="clear-list-title" className="panel-title">
              Delete the guest list
            </h2>
            <p className="hint" style={{ marginBottom: 12 }}>
              Removes every name and reply for this event. Their links stop working. The invite itself stays.
            </p>
            <button
              type="button"
              className="btn btn-danger btn-block"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Delete all ${guests.length} guests and their replies? This can't be undone.`)) {
                  run(() => deleteAllGuests(event.id));
                }
              }}
            >
              Delete all {pluralize(guests.length, "guest")}
            </button>
          </section>
        ) : null}
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
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [list, setList] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function addOne(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = `${first.trim()} ${last.trim()}`.trim();
    if (!first.trim()) {
      setLocalError("Enter the guest's first name.");
      return;
    }
    setLocalError(null);
    run(async () => {
      const r = await addGuests(eventId, [name]);
      if (r.ok) {
        setFirst("");
        setLast("");
      }
      return r;
    });
  }

  function addMany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { names, removedContactDetails } = parseGuestList(list);
    if (names.length === 0) {
      setLocalError("Put one name on each line.");
      return;
    }
    setLocalError(null);
    run(async () => {
      const r = await addGuests(eventId, names);
      if (r.ok) {
        setList("");
        if (removedContactDetails) {
          return { ok: true, message: `${r.message} Phone numbers and emails in the list were left out; only names are saved.` };
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
      <p className="hint">Only names are saved. You choose the contact in WhatsApp, Messages or email when you send.</p>
      <form onSubmit={addOne} noValidate style={{ marginTop: 14 }}>
        <div className="field-row">
          <div className="field">
            <label className="label" htmlFor="guest-first">
              First name
            </label>
            <input id="guest-first" className="input" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={50} autoComplete="off" />
          </div>
          <div className="field">
            <label className="label" htmlFor="guest-last">
              Last name <span className="label-optional">(optional)</span>
            </label>
            <input id="guest-last" className="input" value={last} onChange={(e) => setLast(e.target.value)} maxLength={50} autoComplete="off" />
          </div>
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
        <summary>Paste a list of names</summary>
        <form onSubmit={addMany} noValidate style={{ marginTop: 12 }}>
          <label className="label" htmlFor="guest-list">
            One name per line
          </label>
          <textarea
            id="guest-list"
            className="textarea"
            style={{ minHeight: 140, marginTop: 6 }}
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={"Sofia Martinez\nRavi Iyer\nTom Becker"}
          />
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
  onSave: (input: { name: string; status: RsvpStatus; party_size: number }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(guest.name);
  const [status, setStatus] = useState<RsvpStatus>(guest.status);
  const [party, setParty] = useState(Math.max(1, guest.party_size));
  const idp = `edit-${guest.id}`;

  return (
    <form
      className="guest-edit"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, status, party_size: party });
      }}
    >
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor={`${idp}-name`}>
            Name
          </label>
          <input id={`${idp}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </div>
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
      <p className="hint" style={{ marginTop: 8 }}>
        Set the reply yourself if they answered you in person or in a chat.
      </p>
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
