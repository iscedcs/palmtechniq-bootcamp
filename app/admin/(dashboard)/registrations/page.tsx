import type { Metadata } from "next";
import Link from "next/link";
import { listRegistrations } from "@/lib/admin-queries";
import { compactDate } from "@/lib/dates";
import { formatNaira } from "@/lib/pricing";
import type { RegistrationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Registrations" };

const STATUSES = [
  "",
  "PENDING",
  "PAID",
  "CANCELLED",
  "REFUNDED",
  "TRANSFERRED",
] as const;

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const registrations = await listRegistrations({
    status: (status || undefined) as RegistrationStatus | undefined,
    q: q || undefined,
  });

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Registrations</h1>
        <p className="text-sm text-white/40">
          {registrations.length} shown{registrations.length === 200 && " (capped)"}
        </p>
      </div>

      <form className="mt-7 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name, email, phone, or reference code"
          className="min-w-[260px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-primary/60 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-primary/60 focus:outline-none"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value} className="bg-card">
              {value === "" ? "Any status" : value.toLowerCase()}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-brand-black"
        >
          Filter
        </button>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/35">
              <th className="pb-3 font-medium">Reference</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Track</th>
              <th className="pb-3 font-medium">Tier</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Paid</th>
              <th className="pb-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {registrations.map((registration) => (
              <tr key={registration.id} className="hover:bg-white/3">
                <td className="py-3.5">
                  <Link
                    href={`/admin/registrations/${registration.id}`}
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {registration.referenceCode}
                  </Link>
                </td>
                <td className="py-3.5">
                  <span className="block">{registration.fullName}</span>
                  <span className="block text-xs text-white/35">
                    {registration.email}
                  </span>
                </td>
                <td className="py-3.5 text-white/70">{registration.track.name}</td>
                <td className="py-3.5 text-white/45">
                  {registration.priceTier?.name ?? "—"}
                </td>
                <td className="py-3.5">
                  <StatusBadge status={registration.status} />
                </td>
                <td className="py-3.5 tabular-nums text-white/70">
                  {registration.payments[0]
                    ? formatNaira(registration.payments[0].totalKobo)
                    : "—"}
                </td>
                <td className="py-3.5 text-xs text-white/35">
                  {compactDate.format(registration.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {registrations.length === 0 && (
          <p className="py-12 text-center text-sm text-white/35">
            Nothing matches that.
          </p>
        )}
      </div>
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    {
      PAID: "border-primary/30 bg-primary/10 text-primary",
      SUCCESS: "border-primary/30 bg-primary/10 text-primary",
      PENDING: "border-accent/30 bg-accent/10 text-accent",
      CANCELLED: "border-white/12 bg-white/5 text-white/45",
      ABANDONED: "border-white/12 bg-white/5 text-white/45",
      FAILED: "border-destructive/50 bg-destructive/20 text-white/80",
      REFUNDED: "border-destructive/50 bg-destructive/20 text-white/80",
      TRANSFERRED: "border-secondary/30 bg-secondary/10 text-secondary",
    }[status] ?? "border-white/12 bg-white/5 text-white/45";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${tone}`}>
      {status.toLowerCase()}
    </span>
  );
}
