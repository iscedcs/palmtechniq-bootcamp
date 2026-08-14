import { GridBackdrop } from "@/components/site/grid-backdrop";
import { SectionHeading } from "@/components/home/track-grid";
import type { CohortView } from "@/lib/queries";

export function Venue({ cohort }: { cohort: NonNullable<CohortView> }) {
  if (!cohort.venueName) return null;

  const mapQuery = encodeURIComponent(
    [cohort.venueName, cohort.venueAddress].filter(Boolean).join(", "),
  );

  return (
    <section id="venue" className="relative scroll-mt-20 overflow-hidden py-20">
      <GridBackdrop intensity="subtle" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Venue"
          title="In a room, with a person, in Festac"
          blurb="This cohort is physical. No recordings to fall behind on, no Zoom fatigue — just a small room and someone who can look at your screen."
        />

        <div className="glass-card mt-12 max-w-2xl p-7">
          <p className="text-xl font-semibold">{cohort.venueName}</p>
          {cohort.venueAddress && (
            <p className="mt-2 leading-relaxed text-white/60">
              {cohort.venueAddress}
            </p>
          )}
          {cohort.venueCapacity && (
            <p className="mt-5 text-sm text-white/45">
              Capacity {cohort.venueCapacity}. Tracks are staggered so the room
              is never over it.
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            Open in Maps
          </a>
        </div>
      </div>
    </section>
  );
}
