import Link from "next/link";
import { TrackDecision } from "@/components/admin/track-decision";
import { getAdminOverview } from "@/lib/admin-queries";
import { compactDate, daysUntil } from "@/lib/dates";
import { formatNaira } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  if (!overview) {
    return (
      <p className="text-white/55">
        No cohort is open. Create one and set its status to OPEN.
      </p>
    );
  }

  const { cohort, tracks, totals } = overview;
  const goNoGoIn = cohort.goNoGoOn ? daysUntil(cohort.goNoGoOn) : null;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {cohort.bootcamp.name}
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {cohort.name} · starts {compactDate.format(cohort.startsOn)}
          </p>
        </div>
        {cohort.goNoGoOn && (
          <p className="text-sm text-accent">
            Go/no-go {compactDate.format(cohort.goNoGoOn)}
            {goNoGoIn !== null && goNoGoIn > 0 && ` — ${goNoGoIn} days`}
          </p>
        )}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 lg:grid-cols-4">
        <Stat label="Seats sold" value={`${totals.paid} / ${totals.capacity}`} />
        <Stat label="Held in checkout" value={String(totals.held)} />
        <Stat label="Net collected" value={formatNaira(totals.netKobo)} />
        <Stat
          label="Gross charged"
          value={formatNaira(totals.grossKobo)}
          hint={`incl. ${formatNaira(totals.feeKobo)} fees`}
        />
      </dl>

      {totals.pendingPayments > 0 && (
        <p className="mt-4 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm text-accent">
          {totals.pendingPayments} payment
          {totals.pendingPayments === 1 ? "" : "s"} still pending. The
          reconciliation cron re-checks these every 15 minutes.
        </p>
      )}

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
            Tracks
          </h2>
          <Link
            href="/admin/waitlist"
            className="text-sm text-white/45 transition-colors hover:text-white"
          >
            {totals.waitlistCount} on the waitlist →
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/35">
                <th className="pb-3 font-medium">Track</th>
                <th className="pb-3 font-medium">Paid</th>
                <th className="pb-3 font-medium">Held</th>
                <th className="pb-3 font-medium">Left</th>
                <th className="pb-3 font-medium">Minimum</th>
                <th className="pb-3 text-right font-medium">Go / no-go</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {tracks.map((track) => (
                <tr key={track.id}>
                  <td className="py-3.5">
                    <span className="font-medium">{track.name}</span>
                    <span className="ml-2 text-xs text-white/30">
                      {track.status.toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 tabular-nums">{track.paid}</td>
                  <td className="py-3.5 tabular-nums text-white/45">
                    {track.held}
                  </td>
                  <td className="py-3.5 tabular-nums">{track.seatsLeft}</td>
                  <td className="py-3.5">
                    <span
                      className={
                        track.meetsMinimum ? "text-primary" : "text-accent"
                      }
                    >
                      {track.paid} / {track.minEnrollment}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    {track.status === "NEXT_COHORT" ? (
                      <span className="text-xs text-white/25">—</span>
                    ) : (
                      <TrackDecision
                        trackId={track.id}
                        trackName={track.name}
                        status={track.status}
                        paid={track.paid}
                        minEnrollment={track.minEnrollment}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 max-w-2xl text-xs leading-relaxed text-white/35">
          Cancelling a track only records the decision. It does not refund or
          transfer anyone — those obligations (PRD §9) need the refund copy
          that is still with legal, so they are handled deliberately.
        </p>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-background/60 px-5 py-4">
      <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
        {label}
      </dt>
      <dd className="mt-1.5 text-xl font-semibold tabular-nums">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-white/30">{hint}</p>}
    </div>
  );
}
