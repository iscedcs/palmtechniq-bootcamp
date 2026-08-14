import Image from "next/image";
import Link from "next/link";

const NAV = [
  { href: "#tracks", label: "Tracks" },
  { href: "#schedule", label: "Schedule" },
  { href: "#pricing", label: "Pricing" },
  { href: "#venue", label: "Venue" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        {/* The lockup is 362x71. Width and height are the intrinsic pixel
            dimensions — Next uses them only to reserve the right aspect ratio
            and prevent layout shift; `h-8 w-auto` is what actually sizes it.
            `priority` because it sits above the fold on every page. */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="PalmTechnIQ Bootcamp — home">
          <Image
            src="/assets/palmtechniq-lockup.png"
            alt="PalmTechnIQ"
            width={362}
            height={71}
            priority
            className="h-8 w-auto"
          />
          <span className="hidden border-l border-white/15 pl-2.5 text-xs font-medium uppercase tracking-[0.2em] text-secondary/70 sm:block">
            Bootcamp
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/r"
            className="hidden text-sm text-white/60 transition-colors hover:text-white sm:block">
            Find my registration
          </Link>
          <a
            href="#tracks"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-brand-black transition-transform hover:scale-[1.03]">
            Reserve a seat
          </a>
        </div>
      </div>
    </header>
  );
}
