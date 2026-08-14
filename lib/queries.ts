import { CohortStatus, TrackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { takenByTrack } from "@/lib/capacity";
import { grossUp, type PriceBreakdown } from "@/lib/pricing";

export type TrackCard = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  outcomes: string[];
  slotStart: string | null;
  slotEnd: string | null;
  status: TrackStatus;
  capacity: number;
  minEnrollment: number;
  seatsLeft: number;
  /** True when the track sells now; false means waitlist capture instead. */
  isOpen: boolean;
  facilitator: { name: string; bio: string | null; photoUrl: string | null } | null;
};

export type CohortView = Awaited<ReturnType<typeof getCurrentCohort>>;

/**
 * The cohort the landing page is currently selling.
 *
 * There is deliberately no hardcoded slug anywhere in the render path —
 * launching the next cohort means flipping this one to COMPLETED and the next
 * to OPEN, with no deploy. That is success criterion four in the PRD.
 */
export async function getCurrentCohort() {
  const cohort = await db.cohort.findFirst({
    where: { status: { in: [CohortStatus.OPEN, CohortStatus.RUNNING] } },
    orderBy: { startsOn: "asc" },
    include: {
      bootcamp: true,
      tracks: {
        orderBy: { displayOrder: "asc" },
        include: { facilitator: true },
      },
      priceTiers: {
        where: { isActive: true },
        orderBy: { amountKobo: "asc" },
      },
    },
  });

  if (!cohort) return null;

  const taken = await takenByTrack(cohort.id);

  const tracks: TrackCard[] = cohort.tracks.map((track) => {
    const isOpen =
      track.status === TrackStatus.CONFIRMED ||
      track.status === TrackStatus.PROPOSED ||
      track.status === TrackStatus.RUNNING;

    return {
      id: track.id,
      slug: track.slug,
      name: track.name,
      summary: track.summary,
      outcomes: track.outcomes,
      slotStart: track.slotStart,
      slotEnd: track.slotEnd,
      status: track.status,
      capacity: track.capacity,
      minEnrollment: track.minEnrollment,
      seatsLeft: Math.max(0, track.capacity - (taken.get(track.id) ?? 0)),
      isOpen,
      facilitator:
        track.facilitator && track.facilitator.showPublicly
          ? {
              name: track.facilitator.name,
              bio: track.facilitator.bio,
              photoUrl: track.facilitator.photoUrl,
            }
          : null,
    };
  });

  return { ...cohort, tracks };
}

export type TierCard = {
  id: string;
  name: string;
  price: PriceBreakdown;
  endsAt: Date | null;
  startsAt: Date | null;
  maxSeats: number | null;
  /** Null when the tier is uncapped. */
  seatsLeft: number | null;
};

/**
 * Price tiers for the pricing section, with the fee already itemised.
 *
 * The flyer says ₦15,000. Nobody may discover the processing fee for the first
 * time on the Paystack screen (PRD §7.2), so every surface that shows a price
 * shows the breakdown.
 */
export async function getTierCards(cohortId: string): Promise<TierCard[]> {
  const tiers = await db.priceTier.findMany({
    where: { cohortId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const now = new Date();

  return Promise.all(
    tiers.map(async (tier) => {
      let seatsLeft: number | null = null;
      if (tier.maxSeats !== null) {
        const used = await db.registration.count({
          where: {
            priceTierId: tier.id,
            OR: [
              { status: "PAID" },
              { status: "PENDING", holdExpiresAt: { gt: now } },
            ],
          },
        });
        seatsLeft = Math.max(0, tier.maxSeats - used);
      }

      return {
        id: tier.id,
        name: tier.name,
        price: grossUp(tier.amountKobo),
        startsAt: tier.startsAt,
        endsAt: tier.endsAt,
        maxSeats: tier.maxSeats,
        seatsLeft,
      };
    }),
  );
}

/** Distinct session dates across the cohort, for the schedule section. */
export async function getSessionDates(cohortId: string): Promise<Date[]> {
  const sessions = await db.session.findMany({
    where: { cohortId },
    select: { scheduledFor: true },
    orderBy: { scheduledFor: "asc" },
  });

  const seen = new Set<string>();
  const dates: Date[] = [];
  for (const { scheduledFor } of sessions) {
    const key = scheduledFor.toISOString().slice(0, 10);
    if (!seen.has(key)) {
      seen.add(key);
      dates.push(scheduledFor);
    }
  }
  return dates;
}
