"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { addGift, deleteGift, removeGiftClaim, setShowGifts } from "@/app/dashboard/actions";
import { GIFT_KIND_LABEL, giftSuggestions, guessStore, STORES, storeSearchUrl, type StoreId } from "@/lib/gifts";
import type { ActionResult, EventType, GiftClaimRow, GiftItemRow, GiftKind } from "@/lib/types";

export type ManagedGift = GiftItemRow & { claims: GiftClaimRow[] };

export function GiftManager({
  eventId,
  eventType,
  showGifts,
  gifts,
}: {
  eventId: string;
  eventType: EventType;
  showGifts: boolean;
  gifts: ManagedGift[];
}) {
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [store, setStore] = useState<StoreId>("amazon.com");
  const [kind, setKind] = useState<GiftKind>("item");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    setStore(guessStore(navigator.language));
  }, []);

  function run(task: () => Promise<ActionResult>, after?: () => void) {
    startTransition(async () => {
      const result = await task();
      setNotice(result);
      if (result.ok) after?.();
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      setNotice({ ok: false, error: "Give the gift a name." });
      return;
    }
    run(
      () => addGift(eventId, { kind, title, url: url || null, price_text: price || null, quantity, note: note || null }),
      () => {
        setTitle("");
        setUrl("");
        setPrice("");
        setQuantity(1);
        setNote("");
      },
    );
  }

  const existingTitles = new Set(gifts.map((g) => g.title.toLowerCase()));
  const suggestions = giftSuggestions(eventType).filter((s) => !existingTitles.has(s.title.toLowerCase()));

  return (
    <div className="manage-grid">
      <div>
        {notice ? (
          <p
            className={`notice ${notice.ok ? "notice-success" : "notice-error"}`}
            role={notice.ok ? "status" : "alert"}
            style={{ marginBottom: 16 }}
          >
            {notice.ok ? notice.message : notice.error}
          </p>
        ) : null}

        <section className="guest-table" aria-labelledby="gift-list-title">
          <div className="guest-table-head row-between">
            <h2 id="gift-list-title" style={{ fontSize: 22 }}>
              Your gift list
            </h2>
            <label className="check" style={{ alignItems: "center" }}>
              <input
                type="checkbox"
                checked={showGifts}
                disabled={pending}
                onChange={(e) => {
                  const show = e.target.checked;
                  run(() => setShowGifts(eventId, show));
                }}
              />
              <span>Show on the invite</span>
            </label>
          </div>

          {gifts.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center" }}>
              <p style={{ fontWeight: 600 }}>Nothing on the list yet</p>
              <p className="muted" style={{ marginTop: 6 }}>
                Add things you&rsquo;d love, or tap an idea on the right to start. Guests mark what they&rsquo;re bringing.
              </p>
            </div>
          ) : (
            <ul className="gift-rows">
              {gifts.map((g) => {
                const claimed = g.claims.reduce((sum, c) => sum + c.quantity, 0);
                return (
                  <li key={g.id} className="gift-row">
                    <div>
                      <div className="gift-kind">{GIFT_KIND_LABEL[g.kind]}</div>
                      <div className="gift-title">{g.title}</div>
                      <div className="gift-detail">
                        {[g.price_text, g.note, g.quantity > 1 ? `${claimed} of ${g.quantity} claimed` : null]
                          .filter(Boolean)
                          .join(". ")}
                      </div>
                      {g.url ? (
                        <a className="small" href={g.url} target="_blank" rel="noopener noreferrer nofollow">
                          Open link
                        </a>
                      ) : null}
                    </div>
                    <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                      {claimed >= g.quantity ? (
                        <span className="status status-yes">Claimed</span>
                      ) : (
                        <span className="status status-pending">Available</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm(`Remove "${g.title}" from the gift list?`)) run(() => deleteGift(g.id));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    {g.claims.length > 0 ? (
                      <div className="claim-list" aria-label="Claimed by">
                        {g.claims.map((c) => (
                          <span key={c.id} className="claim-chip">
                            {c.name}
                            <button
                              type="button"
                              aria-label={`Clear ${c.name}'s claim`}
                              title="Clear this claim"
                              onClick={() => run(() => removeGiftClaim(c.id))}
                              disabled={pending}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <p className="hint" style={{ marginTop: 12 }}>
          Guests see what&rsquo;s still available, never who chose what. Only you see the names.
        </p>
      </div>

      <div className="side-stack">
        <section className="panel" aria-labelledby="add-gift-title">
          <h2 id="add-gift-title" className="panel-title">
            Add to the list
          </h2>
          <form onSubmit={submit} noValidate style={{ marginTop: 12 }}>
            <div className="field">
              <label className="label" htmlFor="gift-kind">
                Type
              </label>
              <select id="gift-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as GiftKind)}>
                <option value="item">Gift</option>
                <option value="gift_card">Gift card</option>
                <option value="idea">Something to bring (a dish, drinks)</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="gift-title">
                Name
              </label>
              <input id="gift-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="field">
              <label className="label" htmlFor="gift-url">
                Store link <span className="label-optional">(optional)</span>
              </label>
              <input
                id="gift-url"
                className="input"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="field-row" style={{ marginTop: 18 }}>
              <div className="field">
                <label className="label" htmlFor="gift-price">
                  Price <span className="label-optional">(optional)</span>
                </label>
                <input
                  id="gift-price"
                  className="input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  maxLength={40}
                  placeholder="About $40"
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="gift-qty">
                  How many
                </label>
                <input
                  id="gift-qty"
                  className="input"
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="gift-note">
                Note <span className="label-optional">(optional)</span>
              </label>
              <input
                id="gift-note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Size M, or any color but red"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={pending}>
              Add to list
            </button>
          </form>
        </section>

        {suggestions.length > 0 ? (
          <section className="panel" aria-labelledby="ideas-title">
            <h2 id="ideas-title" className="panel-title">
              Ideas to start with
            </h2>
            <p className="hint" style={{ marginBottom: 12 }}>
              Tap one to add it. Gifts get a store search link you can swap for an exact product later.
            </p>
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="label" htmlFor="gift-store">
                Store for search links
              </label>
              <select id="gift-store" className="select" value={store} onChange={(e) => setStore(e.target.value as StoreId)}>
                {STORES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  className="suggestion"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      addGift(eventId, {
                        kind: s.kind,
                        title: s.title,
                        url: s.kind === "idea" ? null : storeSearchUrl(store, s.title),
                        quantity: 1,
                      }),
                    )
                  }
                >
                  + {s.title}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
