import { RegistrationStatus } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * PRD §8.
 *
 *   available = capacity
 *             - PAID registrations
 *             - PENDING registrations whose hold has not expired
 *
 * Expired holds are also swept by the release-holds cron every five minutes,
 * but the read must not wait for the sweep — a seat freed at 14:03 has to be
 * sellable at 14:03, not at 14:05.
 */
export async function availableSeats(trackId: string): Promise<number> {
  const track = await db.track.findUnique({
    where: { id: trackId },
    select: { capacity: true },
  });
  if (!track) return 0;

  const taken = await countTaken(trackId);
  return Math.max(0, track.capacity - taken);
}

/** Seats held or sold on a track, right now. */
export async function countTaken(trackId: string): Promise<number> {
  const now = new Date();
  return db.registration.count({
    where: {
      trackId,
      OR: [
        { status: RegistrationStatus.PAID },
        {
          status: RegistrationStatus.PENDING,
          holdExpiresAt: { gt: now },
        },
      ],
    },
  });
}

/**
 * The same count for every track in a cohort, in one round trip.
 *
 * The landing page renders live seat counts on every card — at ten seats a
 * track, scarcity is real and worth showing — so this must not be N queries.
 */
export async function takenByTrack(
  cohortId: string,
): Promise<Map<string, number>> {
  const now = new Date();
  const rows = await db.registration.groupBy({
    by: ["trackId"],
    where: {
      cohortId,
      OR: [
        { status: RegistrationStatus.PAID },
        {
          status: RegistrationStatus.PENDING,
          holdExpiresAt: { gt: now },
        },
      ],
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.trackId, row._count._all]));
}
