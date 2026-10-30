"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { isEmail } from "@/lib/validation";

type Step = "email" | "code";

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const address = email.trim().toLowerCase();
    if (!isEmail(address)) {
      setError("Enter an email address like name@example.com.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setBusy(false);
    if (otpError) {
      setError(
        otpError.status === 429
          ? "Too many sign-in emails in a short time. Wait a minute, then try again."
          : `We couldn't send the email: ${otpError.message}`,
      );
      return;
    }
    setEmail(address);
    setStep("code");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(token)) {
      setError("Enter the code from the email. It's a string of digits.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (verifyError) {
      setError("That code didn't work. Check the latest email, or send a new code.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (oauthError) {
      setBusy(false);
      setError(`Google sign-in didn't start: ${oauthError.message}`);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} noValidate>
        <p className="notice notice-success" role="status">
          We sent a sign-in email to <strong>{email}</strong>. Open the link in it on this device to sign in. It can take
          a minute to arrive, so check your spam folder too.
        </p>
        <div className="field" style={{ marginTop: 20 }}>
          <label className="label" htmlFor="code">
            Or enter the code, if your email has one
          </label>
          <input
            id="code"
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        {error ? (
          <p id="login-error" className="notice notice-error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="small muted" style={{ marginTop: 16 }}>
          Wrong address or no email?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </p>
      </form>
    );
  }

  return (
    <div>
      <form onSubmit={sendLink} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            placeholder="you@example.com"
          />
        </div>
        {error ? (
          <p id="login-error" className="notice notice-error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {googleEnabled ? (
        <>
          <div className="divider">or</div>
          <button type="button" className="btn btn-block" onClick={signInWithGoogle} disabled={busy}>
            <GoogleMark />
            Continue with Google
          </button>
        </>
      ) : null}
      <p className="small faint" style={{ marginTop: 20 }}>
        By signing in you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
