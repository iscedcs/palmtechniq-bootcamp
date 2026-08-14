import type { PriceTier } from "@prisma/client";
import { RegistrationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { grossUp, type PriceBreakdown } from "@/lib/pricing";

export type ResolvedTier = {
  tier: PriceTier;
  price: PriceBreakdown;
};

/**
 * Resolve the price tier a registration should be charged at. PRD §7.3.
 *
 * This runs server-side at transaction initialisation and nowhere else. The
 * client never sends an amount and never sends a tier id — a payment started
 * at 00:03 on 22 August resolves to standard pricing regardless of when the
 * page was loaded, and regardless of what the page was showing.
 *
 * Pass `now` explicitly from the caller so the resolution and the hold it
 * creates agree on the instant.
 */
export async function resolveTier(
  cohortId: string,
  trackId: string,
  now: Date = new Date(),
): Promise<ResolvedTier | null> {
  const candidates = await db.priceTier.findMany({
    where: {
      cohortId,
      isActive: true,
      // A null trackId tier applies to every track in the cohort.
      OR: [{ trackId: null }, { trackId }],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { amountKobo: "asc" },
  });

  for (const tier of candidates) {
    if (tier.maxSeats !== null && (await tierSeatsUsed(tier.id, now)) >= tier.maxSeats) {
      continue;
    }
    return { tier, price: grossUp(tier.amountKobo) };
  }

  return null;
}

/**
 * Seats a capped tier has consumed: paid registrations plus live holds.
 *
 * Counting live holds is what stops nine people simultaneously in checkout
 * from all being sold the last three early-bird seats.
 */
export async function tierSeatsUsed(
  priceTierId: string,
  now: Date = new Date(),
): Promise<number> {
  return db.registration.count({
    where: {
      priceTierId,
      OR: [
        { status: RegistrationStatus.PAID },
        { status: RegistrationStatus.PENDING, holdExpiresAt: { gt: now } },
      ],
    },
  });
}

/**
 * The tier a visitor would get right now, for display only.
 *
 * Deliberately the same code path as the authoritative resolution so the page
 * and the charge cannot disagree for any reason other than time passing
 * between the two.
 */
export async function previewTier(
  cohortId: string,
  trackId: string,
): Promise<ResolvedTier | null> {
  return resolveTier(cohortId, trackId);
}
