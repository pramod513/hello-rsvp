import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="section">
        <div className="container-narrow" style={{ textAlign: "center" }}>
          <h1>We couldn&rsquo;t find that page</h1>
          <p className="lead" style={{ margin: "16px auto 28px" }}>
            If you followed an invite link, the event may have been deleted or the link may be incomplete. Ask your host to
            send it again.
          </p>
          <Link href="/" className="btn btn-primary">
            Go to the homepage
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
