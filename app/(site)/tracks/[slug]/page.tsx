import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import { availableSeats } from "@/lib/capacity";
import { compactDate, dateAndTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/pricing";
import { previewTier } from "@/lib/tiers";

export const dynamic = "force-dynamic";

async function getTrack(slug: string) {
  return db.track.findFirst({
    where: { slug, cohort: { status: { in: ["OPEN", "RUNNING"] } } },
    include: {
      cohort: true,
      facilitator: true,
      sessions: { orderBy: { sequence: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrack(slug);
  if (!track) return { title: "Track" };

  return {
    title: track.name,
    description: track.summary ?? undefined,
  };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const track = await getTrack(slug);

  if (!track) notFound();

  const isOpen =
    track.status === "CONFIRMED" ||
    track.status === "PROPOSED" ||
    track.status === "RUNNING";

  const [seatsLeft, tier] = await Promise.all([
    availableSeats(track.id),
    previewTier(track.cohortId, track.id),
  ]);

  const soldOut = isOpen && seatsLeft === 0;

  return (
    <>
      <main className="relative overflow-hidden">
        <GridBackdrop intensity="default" />

        <div className="relative mx-auto max-w-4xl px-5 py-16">
          <Link
            href="/#tracks"
            className="text-sm text-white/45 transition-colors hover:text-white">
            ← All tracks
          </Link>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-secondary/70">
            {track.cohort.name}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {track.name}
          </h1>

          {track.summary && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
              {track.summary}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {isOpen && !soldOut ? (
              <Link
                href={`/register/${track.slug}`}
                className="rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black transition-transform hover:scale-[1.03]">
                Reserve a seat
                {tier && ` — ${formatNaira(tier.price.totalKobo)}`}
              </Link>
            ) : (
              <Link
                href={`/waitlist?track=${track.slug}`}
                className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white">
                {soldOut ? "Join the waitlist" : "Tell me when it opens"}
              </Link>
            )}

            {isOpen && (
              <span className="text-sm text-white/45">
                {soldOut
                  ? "All seats taken"
                  : `${seatsLeft} of ${track.capacity} seats left`}
              </span>
            )}
          </div>

          {tier && isOpen && !soldOut && (
            <p className="mt-4 text-sm text-white/40">
              {formatNaira(tier.price.baseKobo)} +{" "}
              {formatNaira(tier.price.feeKobo)} processing ={" "}
              {formatNaira(tier.price.totalKobo)}
            </p>
          )}

          {track.outcomes.length > 0 && (
            <section className="mt-16">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
                What you'll walk away with
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {track.outcomes.map((outcome) => (
                  <li
                    key={outcome}
                    className="flex gap-3 rounded-xl border border-white/8 bg-white/5 p-4 text-sm leading-relaxed text-white/75">
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    {outcome}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {track.sessions.length > 0 && (
            <section className="mt-16">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
                Session outline
              </h2>
              <ol className="mt-5 divide-y divide-white/8 border-y border-white/8">
                {track.sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-baseline gap-4 py-3.5">
                    <span className="w-6 shrink-0 text-xs text-white/30">
                      {session.sequence}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/85">{session.title}</p>
                      {session.description && (
                        <p className="mt-1 text-xs leading-relaxed text-white/45">
                          {session.description}
                        </p>
                      )}
                    </div>
                    <time
                      dateTime={session.scheduledFor.toISOString()}
                      className="shrink-0 text-xs text-white/40">
                      {dateAndTime(session.scheduledFor)}
                    </time>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Only shown when the facilitator has been confirmed publicly —
              PRD §0 A2 keeps `showPublicly` false until bios are written. */}
          {track.facilitator?.showPublicly && (
            <section className="mt-16">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
                Your facilitator
              </h2>
              <div className="glass-card mt-5 p-6">
                <p className="text-lg font-semibold">
                  {track.facilitator.name}
                </p>
                {track.facilitator.bio && (
                  <p className="mt-3 leading-relaxed text-white/60">
                    {track.facilitator.bio}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="mt-16">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              The practicals
            </h2>
            <dl className="mt-5 divide-y divide-white/8 border-y border-white/8">
              {track.slotStart && track.slotEnd && (
                <Row
                  label="Slot"
                  value={`${track.slotStart} – ${track.slotEnd}, Wed / Fri / Sat`}
                />
              )}
              <Row
                label="Sessions"
                value={`${track.cohort.totalSessions} × 90 minutes`}
              />
              <Row
                label="Runs"
                value={`${compactDate.format(track.cohort.startsOn)} – ${compactDate.format(track.cohort.endsOn)}`}
              />
              {track.cohort.venueName && (
                <Row label="Venue" value={track.cohort.venueName} />
              )}
              <Row
                label="Certificate"
                value={`${track.cohort.minAttendance} of ${track.cohort.totalSessions} sessions attended`}
              />
              <Row
                label="Minimum enrolment"
                value={`${track.minEnrollment} students — this track runs subject to it`}
              />
            </dl>
          </section>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[170px_1fr] sm:gap-4">
      <dt className="text-sm text-white/40">{label}</dt>
      <dd className="text-sm leading-relaxed text-white/85">{value}</dd>
    </div>
  );
}
