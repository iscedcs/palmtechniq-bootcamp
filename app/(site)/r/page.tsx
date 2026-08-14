import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import { formatReferenceCode, normaliseCode } from "@/lib/codes";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Find my registration",
  robots: { index: false },
};

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function lookup(formData: FormData) {
    "use server";

    const typed = String(formData.get("referenceCode") ?? "");
    const code = formatReferenceCode(normaliseCode(typed));

    const registration = await db.registration.findUnique({
      where: { referenceCode: code },
      select: { referenceCode: true },
    });

    if (!registration) {
      redirect("/r?error=notfound");
    }

    redirect(`/r/${registration.referenceCode}`);
  }

  return (
    <>
      <main className="relative overflow-hidden">
        <GridBackdrop intensity="subtle" />

        <div className="relative mx-auto max-w-md px-5 py-20">
          <h1 className="text-3xl font-bold tracking-tight">
            Find my registration
          </h1>
          <p className="mt-4 leading-relaxed text-white/55">
            Enter the reference code from your confirmation email. It looks like{" "}
            <span className="font-mono text-accent">PTQ-B26-XXXX</span>.
          </p>

          <form action={lookup} className="mt-8 space-y-4">
            <label htmlFor="referenceCode" className="sr-only">
              Reference code
            </label>
            <input
              id="referenceCode"
              name="referenceCode"
              required
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="PTQ-B26-XXXX"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-center font-mono text-lg tracking-wider text-white placeholder:text-white/20 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            {error === "notfound" && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm">
                We couldn't find that code. Check your confirmation email — the
                code has no letter O or number 1 in it.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black">
              Find it
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
