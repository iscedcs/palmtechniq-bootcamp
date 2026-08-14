import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getCurrentCohort } from "@/lib/queries";

/**
 * Public chrome.
 *
 * A route group, so `(site)` never appears in a URL — `/`, `/register/coding`
 * and the rest are unchanged. It exists purely so the header and footer stop
 * at the public pages: `/admin` renders its own chrome, and wrapping it in
 * this one gave two stacked headers plus a footer full of marketing links.
 * `/api` is unaffected either way, since route handlers ignore layouts.
 *
 * The venue comes from the open cohort rather than being hardcoded, so moving
 * venue for a future cohort stays a database change (PRD §1.2 success
 * criterion four).
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cohort = await getCurrentCohort();

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter
        venueName={cohort?.venueName}
        venueAddress={cohort?.venueAddress}
      />
    </>
  );
}
