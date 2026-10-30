import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteChrome";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Your events",
  robots: { index: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container site-header-inner">
          <Logo href="/dashboard" />
          <nav className="site-nav" aria-label="Account">
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              Your events
            </Link>
            <Link href="/dashboard/account" className="btn btn-ghost btn-sm hide-sm">
              Account
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main" className="app-main">
        <div className="container">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
