import { GridBackdrop } from "@/components/site/grid-backdrop";
import { TrackAccordion } from "@/components/home/track-accordion";
import { compactDate, daysUntil, longDate } from "@/lib/dates";
import { formatNaira } from "@/lib/pricing";
import type { CohortView, TierCard } from "@/lib/queries";

export function Hero({
  cohort,
  cheapestTier,
  seatsLeft,
}: {
  cohort: NonNullable<CohortView>;
  cheapestTier: TierCard | null;
  seatsLeft: number;
}) {
  const closes = cheapestTier?.endsAt ?? cohort.goNoGoOn;
  const daysLeft = closes ? daysUntil(closes) : null;

  return (
    <section className="relative overflow-hidden">
      <GridBackdrop intensity="strong" />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
        {/* Top Mayrock-style Pill Badge */}

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-8xl">
              <span className="text-gradient">{cohort.bootcamp.name}</span>
            </h1>

            {cohort.bootcamp.tagline && (
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                {cohort.bootcamp.tagline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
            <a
              href="#tracks"
              className="rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black transition-transform hover:scale-[1.03]">
              Choose your track
            </a>
            <a
              href="#pricing"
              className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white">
              See pricing
            </a>
          </div>
        </div>

        {/* Mayrock Interactive Track Accordion */}
        <div className="mt-12">
          <TrackAccordion tracks={cohort.tracks} />
        </div>

        {/* Scarcity is real at ten seats a track, so it is stated plainly
            rather than dressed up as a countdown gimmick. */}
        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-4">
          <Stat label="Starts" value={compactDate.format(cohort.startsOn)} />
          <Stat label="Sessions" value={`${cohort.totalSessions} × 90 min`} />
          <Stat
            label="Seats left"
            value={String(seatsLeft)}
            emphasis={seatsLeft <= 5}
          />
          {cheapestTier ? (
            <Stat
              label={cheapestTier.name}
              value={formatNaira(cheapestTier.price.baseKobo)}
              emphasis
            />
          ) : (
            <Stat label="Pricing" value="—" />
          )}
        </dl>

        {closes && daysLeft !== null && daysLeft > 0 && (
          <p className="mt-5 text-sm text-accent">
            {cheapestTier?.name ?? "Registration"} closes{" "}
            {longDate.format(closes)}
            {" — "}
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-background/60 px-5 py-4">
      <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-xl font-semibold ${
          emphasis ? "text-accent" : "text-white"
        }`}>
        {value}
      </dd>
    </div>
  );
}
