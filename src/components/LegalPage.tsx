import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./SiteChrome";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="section">
        <article className="container prose">
          <h1>{title}</h1>
          <p className="faint">Last updated {updated}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
