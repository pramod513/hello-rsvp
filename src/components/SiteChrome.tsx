import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Logo />
        <nav className="site-nav" aria-label="Main">
          <Link href="/#how-it-works" className="btn btn-ghost btn-sm hide-sm">
            How it works
          </Link>
          <Link href="/login" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/dashboard/new" className="btn btn-primary btn-sm">
            Create an invite
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <p>&copy; {year} Hello RSVP. Free for every host and guest.</p>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
