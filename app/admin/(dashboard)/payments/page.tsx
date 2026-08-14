import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/app/admin/(dashboard)/registrations/page";
import { listPayments } from "@/lib/admin-queries";
import { dateAndTime } from "@/lib/dates";
import { formatNaira } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Payments" };

const STATUSES = ["", "SUCCESS", "PENDING", "FAILED", "ABANDONED", "REFUNDED"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const payments = await listPayments(status || undefined);

  const collected = payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce(
      (acc, payment) => ({
        net: acc.net + payment.baseKobo,
        fee: acc.fee + payment.feeKobo,
        gross: acc.gross + payment.totalKobo,
      }),
      { net: 0, fee: 0, gross: 0 },
    );

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-white/40">
          {formatNaira(collected.net)} net · {formatNaira(collected.fee)} fees ·{" "}
          {formatNaira(collected.gross)} gross
          <span className="ml-2 text-white/25">(in this view)</span>
        </p>
      </div>

      <form className="mt-7 flex gap-3">
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
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/35">
              <th className="pb-3 font-medium">Reference</th>
              <th className="pb-3 font-medium">Student</th>
              <th className="pb-3 font-medium">Track</th>
              <th className="pb-3 font-medium">Via</th>
              <th className="pb-3 font-medium">Net</th>
              <th className="pb-3 font-medium">Fee</th>
              <th className="pb-3 font-medium">Total</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="max-w-[170px] truncate py-3.5 font-mono text-xs text-white/45">
                  {payment.reference}
                </td>
                <td className="py-3.5">
                  <Link
                    href={`/admin/registrations/${payment.registration.id}`}
                    className="hover:underline"
                  >
                    {payment.registration.fullName}
                  </Link>
                  <span className="block font-mono text-xs text-accent">
                    {payment.registration.referenceCode}
                  </span>
                </td>
                <td className="py-3.5 text-white/60">
                  {payment.registration.track.name}
                </td>
                <td className="py-3.5 text-xs text-white/45">
                  {payment.provider.toLowerCase()}
                </td>
                <td className="py-3.5 tabular-nums text-white/70">
                  {formatNaira(payment.baseKobo)}
                </td>
                <td className="py-3.5 tabular-nums text-white/40">
                  {formatNaira(payment.feeKobo)}
                </td>
                <td className="py-3.5 tabular-nums">
                  {formatNaira(payment.totalKobo)}
                </td>
                <td className="py-3.5">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="py-3.5 text-xs text-white/35">
                  {dateAndTime(payment.paidAt ?? payment.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payments.length === 0 && (
          <p className="py-12 text-center text-sm text-white/35">
            No payments match that.
          </p>
        )}
      </div>
    </>
  );
}
