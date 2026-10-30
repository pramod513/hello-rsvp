"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/dashboard/actions";
import type { ActionResult } from "@/lib/types";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteAccount, null);
  return (
    <form action={action}>
      <div className="row">
        <label className="sr-only" htmlFor="confirm-account-delete">
          Type delete to confirm
        </label>
        <input
          id="confirm-account-delete"
          name="confirm"
          className="input"
          placeholder='Type "delete" to confirm'
          autoComplete="off"
          style={{ maxWidth: 260 }}
        />
        <button type="submit" className="btn btn-danger" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      {state && !state.ok ? (
        <p className="notice notice-error" role="alert" style={{ marginTop: 12 }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
