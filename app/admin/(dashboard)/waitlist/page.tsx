import type { Metadata } from "next";
import { listWaitlist } from "@/lib/admin-queries";
import { compactDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Waitlist" };

export default async function WaitlistPage() {
  const entries = await listWaitlist();

  // Which tracks people actually want is the input to the next cohort's track
  // list, so it is worth surfacing rather than leaving in the table.
  const demand = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.track?.name ?? entry.trackName ?? "No preference";
    demand.set(key, (demand.get(key) ?? 0) + 1);
  }
  const ranked = [...demand.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Waitlist</h1>
        <p className="text-sm text-white/40">{entries.length} people</p>
      </div>

      {ranked.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-2">
          {ranked.map(([name, count]) => (
            <span
              key={name}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm"
            >
              {name}
              <span className="ml-2 tabular-nums text-secondary">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/35">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Phone</th>
              <th className="pb-3 font-medium">Wants</th>
              <th className="pb-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="py-3.5">{entry.fullName}</td>
                <td className="py-3.5 text-white/60">{entry.email}</td>
                <td className="py-3.5 text-white/45">{entry.phone ?? "—"}</td>
                <td className="py-3.5 text-white/60">
                  {entry.track?.name ?? entry.trackName ?? "No preference"}
                </td>
                <td className="py-3.5 text-xs text-white/35">
                  {compactDate.format(entry.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <p className="py-12 text-center text-sm text-white/35">
            Nobody yet.
          </p>
        )}
      </div>
    </>
  );
}
