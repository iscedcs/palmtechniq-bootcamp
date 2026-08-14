import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfflinePaymentForm } from "@/components/admin/offline-payment-form";
import { StatusBadge } from "@/app/admin/(dashboard)/registrations/page";
import { dateAndTime, longDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Registration" };

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const registration = await db.registration.findUnique({
    where: { id },
    include: {
      track: true,
      cohort: true,
      priceTier: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!registration) notFound();

  const audit = await db.auditLog.findMany({
    where: { entityType: "Registration", entityId: id },
    orderBy: { createdAt: "desc" },
  });

  const expected = registration.priceTier?.amountKobo ?? null;

  return (
    <>
      <Link
        href="/admin/registrations"
        className="text-sm text-white/45 transition-colors hover:text-white"
      >
        ← Registrations
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-sm tracking-wider text-accent">
            {registration.referenceCode}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {registration.fullName}
          </h1>
        </div>
        <StatusBadge status={registration.status} />
      </div>

      <div className="mt-9 grid gap-9 lg:grid-cols-[1fr_340px]">
        <div>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              Details
            </h2>
            <dl className="mt-4 divide-y divide-white/8 border-y border-white/8">
              <Row label="Email" value={registration.email} />
              <Row label="Phone" value={registration.phone} />
              <Row label="Track" value={registration.track.name} />
              <Row label="Cohort" value={registration.cohort.name} />
              <Row
                label="Tier"
                value={
                  registration.priceTier
                    ? `${registration.priceTier.name} — ${formatNaira(registration.priceTier.amountKobo)} net`
                    : "—"
                }
              />
              <Row
                label="Experience"
                value={registration.experience.toLowerCase()}
              />
              {registration.dateOfBirth && (
                <Row
                  label="Date of birth"
                  value={longDate.format(registration.dateOfBirth)}
                />
              )}
              {registration.guardianName && (
                <Row
                  label="Guardian"
                  value={`${registration.guardianName} — ${registration.guardianPhone ?? "no phone"}`}
                />
              )}
              {registration.heardFrom && (
                <Row label="Heard from" value={registration.heardFrom} />
              )}
              {registration.utmSource && (
                <Row
                  label="Campaign"
                  value={[
                    registration.utmSource,
                    registration.utmMedium,
                    registration.utmCampaign,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                />
              )}
              <Row
                label="Registered"
                value={dateAndTime(registration.createdAt)}
              />
              {registration.holdExpiresAt && (
                <Row
                  label="Hold expires"
                  value={dateAndTime(registration.holdExpiresAt)}
                />
              )}
            </dl>

            {registration.motivation && (
              <div className="mt-6 rounded-xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/35">
                  What they want out of it
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {registration.motivation}
                </p>
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
              Payments
            </h2>
            {registration.payments.length === 0 ? (
              <p className="mt-4 text-sm text-white/35">Nothing recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/35">
                      <th className="pb-3 font-medium">Reference</th>
                      <th className="pb-3 font-medium">Via</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {registration.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="max-w-[180px] truncate py-3 font-mono text-xs text-white/50">
                          {payment.reference}
                        </td>
                        <td className="py-3 text-xs text-white/50">
                          {payment.provider.toLowerCase()}
                        </td>
                        <td className="py-3 tabular-nums">
                          {formatNaira(payment.totalKobo)}
                          {payment.feeKobo > 0 && (
                            <span className="ml-1 text-xs text-white/30">
                              incl. {formatNaira(payment.feeKobo)} fee
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="py-3 text-xs text-white/35">
                          {dateAndTime(payment.paidAt ?? payment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {audit.length > 0 && (
            <section className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
                Audit trail
              </h2>
              <ul className="mt-4 divide-y divide-white/8 border-y border-white/8">
                {audit.map((entry) => (
                  <li key={entry.id} className="py-3 text-sm">
                    <span className="font-mono text-xs text-secondary">
                      {entry.action}
                    </span>
                    <span className="ml-3 text-white/45">
                      {entry.actorEmail ?? entry.actorId ?? "system"}
                    </span>
                    <span className="ml-3 text-xs text-white/30">
                      {dateAndTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {registration.status === "PAID" ? (
            <div className="glass-card p-6">
              <p className="text-sm font-semibold text-primary">Seat confirmed</p>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Nothing outstanding on this registration.
              </p>
            </div>
          ) : (
            <OfflinePaymentForm
              registrationId={registration.id}
              defaultAmountNaira={expected ? expected / 100 : 0}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-sm text-white/40">{label}</dt>
      <dd className="text-sm leading-relaxed text-white/85">{value}</dd>
    </div>
  );
}
