import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </div>

      <section className="panel" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title" className="panel-title">
          Delete your account
        </h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Permanently removes your account and everything in it: every event, guest list, reply, gift list and photo.
          Guests&rsquo; invite links stop working. This can&rsquo;t be undone.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
