import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/register/registration-form";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import { availableSeats } from "@/lib/capacity";
import { compactDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/pricing";
import { previewTier } from "@/lib/tiers";

export const dynamic = "force-dynamic";

async function getTrack(slug: string) {
  return db.track.findFirst({
    where: { slug, cohort: { status: { in: ["OPEN", "RUNNING"] } } },
    include: { cohort: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackSlug: string }>;
}): Promise<Metadata> {
  const { trackSlug } = await params;
  const track = await getTrack(trackSlug);
  return { title: track ? `Register — ${track.name}` : "Register" };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ trackSlug: string }>;
}) {
  const { trackSlug } = await params;
  const track = await getTrack(trackSlug);

  if (!track) notFound();

  if (track.status === "NEXT_COHORT" || track.status === "CANCELLED") {
    return <Closed trackName={track.name} trackSlug={track.slug} />;
  }

  const [seatsLeft, tier] = await Promise.all([
    availableSeats(track.id),
    previewTier(track.cohortId, track.id),
  ]);

  if (seatsLeft === 0) {
    return <Closed trackName={track.name} trackSlug={track.slug} full />;
  }

  if (!tier) {
    return <Closed trackName={track.name} trackSlug={track.slug} />;
  }

  return (
    <>
      <main className="relative overflow-hidden">
        <GridBackdrop intensity="subtle" />

        <div className="relative mx-auto grid max-w-5xl gap-10 px-5 py-14 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/70">
              {track.cohort.name}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Register for {track.name}
            </h1>
            <p className="mt-4 max-w-lg leading-relaxed text-white/55">
              Your seat is held for 30 minutes once you submit, which is plenty
              of time to pay.
            </p>

            <RegistrationForm
              trackSlug={track.slug}
              cohortStartsOn={track.cohort.startsOn.toISOString()}
            />
          </div>

          {/* PRD §7.2 — the fee is itemised before checkout, never discovered
              for the first time on the Paystack screen. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="glass-card p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
                {tier.tier.name}
              </p>

              <dl className="mt-5 space-y-2 text-sm">
                <Row
                  label={track.name}
                  value={formatNaira(tier.price.baseKobo)}
                />
                <Row
                  label="Processing fee"
                  value={formatNaira(tier.price.feeKobo)}
                />
                <div className="flex justify-between gap-4 border-t border-white/10 pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatNaira(tier.price.totalKobo)}
                  </dd>
                </div>
              </dl>

              <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm text-white/55">
                <li>{track.cohort.totalSessions} sessions × 90 minutes</li>
                {track.slotStart && track.slotEnd && (
                  <li>
                    {track.slotStart} – {track.slotEnd}, Wed / Fri / Sat
                  </li>
                )}
                <li>Starts {compactDate.format(track.cohort.startsOn)}</li>
                {track.cohort.venueName && <li>{track.cohort.venueName}</li>}
              </ul>

              <p className="mt-6 text-xs text-white/40">
                {seatsLeft} of {track.capacity} seats left. Runs subject to a
                minimum of {track.minEnrollment} students.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-white/55">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Closed({
  trackName,
  trackSlug,
  full = false,
}: {
  trackName: string;
  trackSlug: string;
  full?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-5 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        {full ? `${trackName} is full` : `${trackName} isn't open yet`}
      </h1>
      <p className="mt-4 leading-relaxed text-white/55">
        {full
          ? "All ten seats are taken. Join the waitlist and you'll be first to hear if one frees up."
          : "This track runs in a future cohort. Join the waitlist and we'll tell you the moment it opens."}
      </p>
      <Link
        href={`/waitlist?track=${trackSlug}`}
        className="mx-auto mt-8 rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black">
        Join the waitlist
      </Link>
    </main>
  );
}
