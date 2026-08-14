import { GridBackdrop } from "@/components/site/grid-backdrop";
import { SectionHeading } from "@/components/home/track-grid";
import { longDate, shortDate } from "@/lib/dates";
import type { CohortView, TrackCard } from "@/lib/queries";

/**
 * PRD §2.3.
 *
 * Venue capacity is 10 and three tracks run, so tracks are staggered and never
 * concurrent. Room occupancy never exceeds 10; the 30-minute gaps absorb
 * turnover and overrun. Saying this plainly answers the two questions every
 * prospective student actually has — when exactly, and where exactly.
 */
export function Schedule({
  cohort,
  tracks,
  sessionDates,
}: {
  cohort: NonNullable<CohortView>;
  tracks: TrackCard[];
  sessionDates: Date[];
}) {
  const scheduled = tracks
    .filter((track) => track.slotStart && track.slotEnd)
    .sort((a, b) => (a.slotStart ?? "").localeCompare(b.slotStart ?? ""));

  return (
    <section
      id="schedule"
      className="relative scroll-mt-20 overflow-hidden py-20"
    >
      <GridBackdrop intensity="subtle" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Schedule"
          title="Wednesdays, Fridays, Saturdays"
          blurb={`${cohort.totalSessions} sessions of 90 minutes per track. Tracks are staggered, so the room never holds more than ${cohort.venueCapacity ?? 10} people.`}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              Daily slots
            </h3>
            <ol className="mt-5 space-y-3">
              {scheduled.map((track) => (
                <li
                  key={track.id}
                  className="glass-card flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span className="font-mono text-sm text-accent">
                    {track.slotStart} – {track.slotEnd}
                  </span>
                  <span className="text-right text-sm font-medium">
                    {track.name}
                  </span>
                </li>
              ))}
            </ol>

            {cohort.orientationAt && (
              <p className="mt-6 text-sm text-white/55">
                <span className="font-medium text-white/80">Orientation:</span>{" "}
                {longDate.format(cohort.orientationAt)}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              Session dates
            </h3>
            <ul className="mt-5 flex flex-wrap gap-2">
              {sessionDates.map((date, index) => (
                <li
                  key={date.toISOString()}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm"
                >
                  <span className="text-xs text-white/35">{index + 1}</span>
                  <time dateTime={date.toISOString()}>
                    {shortDate.format(date)}
                  </time>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-sm text-white/45">
              A certificate needs {cohort.minAttendance} of{" "}
              {cohort.totalSessions} sessions attended.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
