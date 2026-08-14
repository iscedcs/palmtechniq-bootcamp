import type { Metadata } from "next";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { Pricing } from "@/components/home/pricing";
import { Schedule } from "@/components/home/schedule";
import { TrackGrid } from "@/components/home/track-grid";
import { Venue } from "@/components/home/venue";
import { getCurrentCohort, getSessionDates, getTierCards } from "@/lib/queries";

/**
 * Seat counts and tier availability change as people buy, so this page is
 * rendered per request rather than cached. LCP budget is 2.5s on 3G (PRD §15)
 * and the whole page is four indexed queries, so this is affordable.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cohort = await getCurrentCohort();
  if (!cohort) return { title: "PalmTechnIQ Bootcamp" };

  return {
    title: `${cohort.bootcamp.name} — ${cohort.name}`,
    description:
      cohort.bootcamp.tagline ?? cohort.bootcamp.description ?? undefined,
  };
}

export default async function HomePage() {
  const cohort = await getCurrentCohort();

  if (!cohort) {
    return (
      <>
        <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            No cohort is open right now
          </h1>
          <p className="mt-4 text-white/55">
            Join the waitlist and we will tell you the moment the next one
            opens.
          </p>
          <a
            href="/waitlist"
            className="mx-auto mt-8 rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black">
            Join the waitlist
          </a>
        </main>
      </>
    );
  }

  const [tiers, sessionDates] = await Promise.all([
    getTierCards(cohort.id),
    getSessionDates(cohort.id),
  ]);

  const openTracks = cohort.tracks.filter((track) => track.isOpen);
  const seatsLeft = openTracks.reduce((sum, track) => sum + track.seatsLeft, 0);

  // The tier a visitor would actually be charged at today: cheapest that is
  // live and not exhausted. Same ordering the server-side resolution uses.
  const now = new Date();
  const cheapestTier =
    tiers
      .filter(
        (tier) =>
          (tier.startsAt === null || tier.startsAt <= now) &&
          (tier.endsAt === null || tier.endsAt >= now) &&
          tier.seatsLeft !== 0,
      )
      .sort((a, b) => a.price.baseKobo - b.price.baseKobo)[0] ?? null;

  return (
    <>
      <main>
        <Hero
          cohort={cohort}
          cheapestTier={cheapestTier}
          seatsLeft={seatsLeft}
        />
        <TrackGrid tracks={cohort.tracks} />
        <Schedule
          cohort={cohort}
          tracks={cohort.tracks}
          sessionDates={sessionDates}
        />
        <Pricing tiers={tiers} />
        <Venue cohort={cohort} />
        <Faq cohort={cohort} />
      </main>
    </>
  );
}
