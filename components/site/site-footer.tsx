import Image from "next/image";
import Link from "next/link";
import { GridBackdrop } from "@/components/site/grid-backdrop";

export function SiteFooter({
  venueName,
  venueAddress,
}: {
  venueName?: string | null;
  venueAddress?: string | null;
}) {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/5">
      <GridBackdrop intensity="subtle" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/assets/palmtechniq-lockup.png"
              alt="PalmTechnIQ"
              width={362}
              height={71}
              className="h-9 w-auto"
            />
            <span className="border-l border-white/15 pl-2.5 text-xs font-medium uppercase tracking-[0.2em] text-secondary/70">
              Bootcamp
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
            Small-group, in-person bootcamps in Lagos. Ten seats a track, so
            nobody sits at the back.
          </p>
        </div>

        {venueName && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/70">
              Venue
            </p>
            <p className="mt-3 text-sm text-white/70">{venueName}</p>
            {venueAddress && (
              <p className="mt-1 text-sm leading-relaxed text-white/50">
                {venueAddress}
              </p>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/70">
            Links
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li>
              <Link href="/r" className="transition-colors hover:text-white">
                Find my registration
              </Link>
            </li>
            <li>
              <Link
                href="/waitlist"
                className="transition-colors hover:text-white"
              >
                Join the waitlist
              </Link>
            </li>
            <li>
              <Link
                href="/bootcamps"
                className="transition-colors hover:text-white"
              >
                Past cohorts
              </Link>
            </li>
            <li>
              <a
                href="https://palmtechniq.com"
                className="transition-colors hover:text-white"
              >
                Main platform
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/5 px-5 py-5">
        <p className="mx-auto max-w-6xl text-xs text-white/35">
          © {new Date().getFullYear()} PalmTechnIQ. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
