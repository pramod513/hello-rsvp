"use client";

import { useState, useTransition } from "react";
import { claimGift, releaseGift } from "@/app/i/[slug]/actions";
import { GIFT_KIND_LABEL } from "@/lib/gifts";
import type { PublicGift } from "@/lib/public-data";
import type { ActionResult } from "@/lib/types";

export function GiftList({
  slug,
  gifts,
  guestName,
  token,
  canClaim,
}: {
  slug: string;
  gifts: PublicGift[];
  guestName: string | null;
  token: string | null;
  canClaim: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState(guestName ?? "");
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function claim(giftId: string) {
    startTransition(async () => {
      const result = await claimGift({ slug, giftId, name, token });
      setNotice(result);
      if (result.ok) setOpenId(null);
    });
  }

  function release(claimId: string) {
    startTransition(async () => {
      setNotice(await releaseGift({ slug, claimId, token }));
    });
  }

  return (
    <div>
      {notice ? (
        <p
          className={`notice ${notice.ok ? "notice-success" : "notice-error"}`}
          role={notice.ok ? "status" : "alert"}
          style={{ margin: "12px 0" }}
        >
          {notice.ok ? notice.message : notice.error}
        </p>
      ) : null}
      <ul className="gift-rows" style={{ marginTop: 8 }}>
        {gifts.map((g) => {
          const remaining = Math.max(0, g.quantity - g.claimed);
          const mine = g.myClaimIds.length > 0;
          return (
            <li key={g.id} className="gift-row">
              <div>
                <div className="gift-kind">{GIFT_KIND_LABEL[g.kind]}</div>
                <div className="gift-title" style={remaining === 0 && !mine ? { color: "var(--ink-faint)" } : undefined}>
                  {g.title}
                </div>
                {g.price_text || g.note ? (
                  <div className="gift-detail">{[g.price_text, g.note].filter(Boolean).join(". ")}</div>
                ) : null}
                {g.url ? (
                  <a className="small" href={g.url} target="_blank" rel="noopener noreferrer nofollow">
                    See it in the store
                  </a>
                ) : null}
              </div>
              <div style={{ textAlign: "right" }}>
                {mine ? (
                  <>
                    <span className="status status-yes">You&rsquo;re getting this</span>
                    {token ? (
                      <div>
                        <button type="button" className="link-button small" onClick={() => release(g.myClaimIds[0])} disabled={pending}>
                          Undo
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : remaining === 0 ? (
                  <span className="status status-pending">Taken</span>
                ) : canClaim ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    aria-expanded={openId === g.id}
                    onClick={() => setOpenId(openId === g.id ? null : g.id)}
                  >
                    I&rsquo;ll get this
                  </button>
                ) : null}
                {g.quantity > 1 && remaining > 0 ? (
                  <div className="small faint" style={{ marginTop: 4 }}>
                    {remaining} of {g.quantity} still needed
                  </div>
                ) : null}
              </div>

              {openId === g.id ? (
                <form
                  className="guest-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    claim(g.id);
                  }}
                >
                  <label className="label" htmlFor={`claim-${g.id}`}>
                    Your name
                  </label>
                  <p className="hint">Only the host sees who&rsquo;s bringing what.</p>
                  <div className="row" style={{ marginTop: 8 }}>
                    <input
                      id={`claim-${g.id}`}
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      style={{ flex: "1 1 200px" }}
                      autoComplete="name"
                    />
                    <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
                      Mark as mine
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
