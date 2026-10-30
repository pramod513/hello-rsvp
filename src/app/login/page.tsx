import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { safeNextPath } from "@/lib/site";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Enter your email to get a new one.",
  oauth: "Google sign-in didn't finish. Try again, or use your email instead.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const error = params.error ? (ERRORS[params.error] ?? ERRORS.link) : null;
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

  return (
    <div className="auth-page">
      <header className="site-header">
        <div className="container site-header-inner">
          <Logo />
        </div>
      </header>
      <main id="main" className="auth-main">
        <div className="auth-panel panel">
          <h1 style={{ fontSize: 32 }}>Sign in to Hello RSVP</h1>
          <p className="muted" style={{ marginTop: 8, marginBottom: 24 }}>
            Create invites and see replies. New here? Signing in creates your free account.
          </p>
          {error ? (
            <p className="notice notice-error" role="alert" style={{ marginBottom: 20 }}>
              {error}
            </p>
          ) : null}
          <LoginForm next={next} googleEnabled={googleEnabled} />
        </div>
      </main>
    </div>
  );
}
