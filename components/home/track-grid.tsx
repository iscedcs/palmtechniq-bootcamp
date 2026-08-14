import Link from "next/link";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import type { TrackCard } from "@/lib/queries";

/**
 * PRD §3 and §8.
 *
 * All five learning areas are shown. Two are marked "Next cohort" and capture
 * waitlist interest instead of registrations — driven by `Track.status`, not
 * by code, so opening Graphic Design in December is a status change.
 *
 * A sold-out track switches to a waitlist form rather than disappearing.
 */
export function TrackGrid({ tracks }: { tracks: TrackCard[] }) {
  return (
    <section id="tracks" className="relative scroll-mt-20 overflow-hidden py-20">
      <GridBackdrop intensity="subtle" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Tracks"
          title="Pick one thing and get good at it"
          blurb="Ten seats a track. Tracks run subject to a minimum enrolment, and the go/no-go call is made before the first session."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <TrackCardView key={track.id} track={track} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrackCardView({ track }: { track: TrackCard }) {
  const soldOut = track.isOpen && track.seatsLeft === 0;
  const nextCohort = !track.isOpen;

  return (
    <article className="glass-card hover-glow flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold leading-tight">
          <Link
            href={`/tracks/${track.slug}`}
            className="transition-colors hover:text-secondary"
          >
            {track.name}
          </Link>
        </h3>
        {nextCohort ? (
          <Badge tone="muted">Next cohort</Badge>
        ) : soldOut ? (
          <Badge tone="maroon">Full</Badge>
        ) : (
          <Badge tone={track.seatsLeft <= 3 ? "accent" : "primary"}>
            {track.seatsLeft} left
          </Badge>
        )}
      </div>

      {track.slotStart && track.slotEnd && (
        <p className="mt-2 text-sm text-secondary/80">
          {track.slotStart} – {track.slotEnd}
        </p>
      )}

      {track.summary && (
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          {track.summary}
        </p>
      )}

      {track.outcomes.length > 0 && (
        <ul className="mt-5 space-y-2 text-sm text-white/70">
          {track.outcomes.slice(0, 3).map((outcome) => (
            <li key={outcome} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
              {outcome}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex-1" />

      {nextCohort || soldOut ? (
        <Link
          href={`/waitlist?track=${track.slug}`}
          className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          {soldOut ? "Join the waitlist" : "Tell me when it opens"}
        </Link>
      ) : (
        <Link
          href={`/register/${track.slug}`}
          className="rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-brand-black transition-transform hover:scale-[1.02]"
        >
          Reserve a seat
        </Link>
      )}

      <Link
        href={`/tracks/${track.slug}`}
        className="mt-3 text-center text-xs text-white/40 transition-colors hover:text-white/70"
      >
        See the full outline
      </Link>

      {track.isOpen && !soldOut && (
        <p className="mt-3 text-center text-xs text-white/35">
          Runs subject to a minimum of {track.minEnrollment} students
        </p>
      )}
    </article>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "accent" | "maroon" | "muted";
}) {
  const tones = {
    primary: "border-primary/30 bg-primary/10 text-primary",
    accent: "border-accent/30 bg-accent/10 text-accent",
    maroon: "border-destructive/50 bg-destructive/20 text-white/80",
    muted: "border-white/15 bg-white/5 text-white/50",
  }[tone];

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${tones}`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/70">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {blurb && (
        <p className="mt-4 leading-relaxed text-white/55">{blurb}</p>
      )}
    </div>
  );
}
