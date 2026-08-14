import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import { dateAndTime, longDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My registration",
  robots: { index: false },
};

/**
 * The student portal. PRD §13.1 `/r/[referenceCode]`.
 *
 * No account, no password — the reference code is the credential, which is
 * why it is generated from an alphabet with no ambiguous glyphs and is never
 * indexed. Check-in and the attendance record land here in Phase 3.
 */
export default async function StudentPage({
  params,
}: {
  params: Promise<{ referenceCode: string }>;
}) {
  const { referenceCode } = await params;

  const registration = await db.registration.findUnique({
    where: { referenceCode: decodeURIComponent(referenceCode) },
    include: {
      cohort: true,
      track: { include: { sessions: { orderBy: { sequence: "asc" } } } },
      payments: { orderBy: { createdAt: "desc" } },
      attendance: true,
    },
  });

  if (!registration) notFound();

  const paid = registration.status === "PAID";
  const successfulPayment = registration.payments.find(
    (payment) => payment.status === "SUCCESS",
  );
  const attended = registration.attendance.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE",
  ).length;

  return (
    <>
      <main className="relative overflow-hidden">
        <GridBackdrop intensity="subtle" />

        <div className="relative mx-auto max-w-3xl px-5 py-14">
          <p className="font-mono text-sm tracking-wider text-accent">
            {registration.referenceCode}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {registration.fullName}
          </h1>
          <p className="mt-2 text-white/55">
            {registration.track.name} · {registration.cohort.name}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <StatusPill paid={paid} status={registration.status} />
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
              {attended} of {registration.cohort.totalSessions} sessions
              attended
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
              {registration.cohort.minAttendance} needed for a certificate
            </span>
          </div>

          {!paid && (
            <div className="glass-card mt-8 border-accent/25 p-6">
              <p className="font-semibold text-accent">Payment outstanding</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Your seat isn't confirmed yet. If you've already paid by
                transfer, reply to your confirmation email and we'll record it
                against this code.
              </p>
            </div>
          )}

          {registration.cohort.whatsappGroupUrl && paid && (
            <a
              href={registration.cohort.whatsappGroupUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 block rounded-2xl bg-primary px-7 py-4 text-center font-semibold text-brand-black">
              Join the WhatsApp group
            </a>
          )}

          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              Your schedule
            </h2>
            <ol className="mt-5 divide-y divide-white/8 border-y border-white/8">
              {registration.track.sessions.map((session) => {
                const record = registration.attendance.find(
                  (entry) => entry.sessionId === session.id,
                );
                return (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white/85">
                        {session.title}
                      </p>
                      <p className="text-xs text-white/40">
                        {dateAndTime(session.scheduledFor)}
                      </p>
                    </div>
                    {record ? (
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                        {record.status.toLowerCase()}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-white/25">—</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              Details
            </h2>
            <dl className="mt-5 divide-y divide-white/8 border-y border-white/8">
              {registration.cohort.orientationAt && (
                <Row
                  label="Orientation"
                  value={longDate.format(registration.cohort.orientationAt)}
                />
              )}
              {registration.track.slotStart && registration.track.slotEnd && (
                <Row
                  label="Slot"
                  value={`${registration.track.slotStart} – ${registration.track.slotEnd}`}
                />
              )}
              {registration.cohort.venueName && (
                <Row label="Venue" value={registration.cohort.venueName} />
              )}
              {registration.cohort.venueAddress && (
                <Row label="Address" value={registration.cohort.venueAddress} />
              )}
              {successfulPayment && (
                <Row
                  label="Paid"
                  value={formatNaira(successfulPayment.totalKobo)}
                />
              )}
            </dl>
          </section>
        </div>
      </main>
    </>
  );
}

function StatusPill({ paid, status }: { paid: boolean; status: string }) {
  return (
    <span
      className={`rounded-full border px-4 py-2 text-sm font-medium ${
        paid
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-accent/30 bg-accent/10 text-accent"
      }`}>
      {paid ? "Seat confirmed" : status.toLowerCase()}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-white/40">{label}</dt>
      <dd className="text-sm leading-relaxed text-white/85">{value}</dd>
    </div>
  );
}
