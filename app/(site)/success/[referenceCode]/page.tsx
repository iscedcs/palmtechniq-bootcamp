import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import { dateAndTime, longDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You're in",
  robots: { index: false },
};

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ referenceCode: string }>;
}) {
  const { referenceCode } = await params;

  const registration = await db.registration.findUnique({
    where: { referenceCode: decodeURIComponent(referenceCode) },
    include: {
      cohort: true,
      track: {
        include: {
          sessions: { orderBy: { scheduledFor: "asc" }, take: 1 },
        },
      },
      payments: {
        where: { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!registration) notFound();

  const payment = registration.payments[0];
  const firstSession = registration.track.sessions[0];

  return (
    <>
      <main className="relative overflow-hidden">
        <GridBackdrop intensity="default" />

        <div className="relative mx-auto max-w-2xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Payment confirmed
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            You're in, {registration.fullName.split(" ")[0]}.
          </h1>
          <p className="mt-4 leading-relaxed text-white/60">
            Your seat on {registration.track.name} is booked. Keep the reference
            code below. it's how you find your schedule, check in, and get your
            certificate.
          </p>

          <div className="glass-card mt-9 p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-white/40">
              Your reference code
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-accent">
              {registration.referenceCode}
            </p>
          </div>

          {/* PRD §14 — the highest-conversion moment in the funnel. */}
          {registration.cohort.whatsappGroupUrl ? (
            <a
              href={registration.cohort.whatsappGroupUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 block rounded-2xl bg-primary px-7 py-4 text-center font-semibold text-brand-black transition-transform hover:scale-[1.01]">
              Join the WhatsApp group
            </a>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/55">
              We'll email you the WhatsApp group link shortly that's where
              day-to-day updates happen.
            </p>
          )}

          <dl className="mt-9 divide-y divide-white/8 border-y border-white/8">
            <Row label="Track" value={registration.track.name} />
            <Row label="Cohort" value={registration.cohort.name} />
            {registration.track.slotStart && registration.track.slotEnd && (
              <Row
                label="Your slot"
                value={`${registration.track.slotStart} – ${registration.track.slotEnd}, Wed / Fri / Sat`}
              />
            )}
            {registration.cohort.orientationAt && (
              <Row
                label="Orientation"
                value={longDate.format(registration.cohort.orientationAt)}
              />
            )}
            {firstSession && (
              <Row
                label="First session"
                value={dateAndTime(firstSession.scheduledFor)}
              />
            )}
            {registration.cohort.venueName && (
              <Row
                label="Venue"
                value={`${registration.cohort.venueName}${
                  registration.cohort.venueAddress
                    ? ` — ${registration.cohort.venueAddress}`
                    : ""
                }`}
              />
            )}
            {payment && (
              <Row
                label="Paid"
                value={`${formatNaira(payment.totalKobo)} (${formatNaira(
                  payment.baseKobo,
                )} + ${formatNaira(payment.feeKobo)} processing)`}
              />
            )}
          </dl>

          <Link
            href={`/r/${registration.referenceCode}`}
            className="mt-9 inline-flex rounded-full border border-white/15 px-6 py-3 font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white">
            Go to my schedule
          </Link>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-white/40">{label}</dt>
      <dd className="text-sm leading-relaxed text-white/85">{value}</dd>
    </div>
  );
}
