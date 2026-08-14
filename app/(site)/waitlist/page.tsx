import type { Metadata } from "next";
import { Suspense } from "react";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { GridBackdrop } from "@/components/site/grid-backdrop";
import { getCurrentCohort } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "Tell us which track you want and we'll let you know the moment it opens.",
};

export default async function WaitlistPage() {
  const cohort = await getCurrentCohort();

  const tracks = (cohort?.tracks ?? []).map((track) => ({
    slug: track.slug,
    name: track.name,
  }));

  return (
    <>
      <main className="relative overflow-hidden">
        <GridBackdrop intensity="subtle" />

        <div className="relative mx-auto max-w-lg px-5 py-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Join the waitlist
          </h1>
          <p className="mt-4 leading-relaxed text-white/55">
            Tracks are small and some aren't running this cohort. Tell us what
            you want and you'll be first to hear.
          </p>

          <Suspense>
            <WaitlistForm tracks={tracks} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
