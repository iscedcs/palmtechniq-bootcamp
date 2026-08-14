import { CohortStatus, RegistrationStatus } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * The overview numbers. PRD §13.2 dashboard, §15 observability.
 *
 * Revenue is summed over successful payments rather than over registrations,
 * so it reflects money actually collected — including offline and comp
 * payments, and excluding anyone still holding a seat.
 */
export async function getAdminOverview() {
  const cohort = await db.cohort.findFirst({
    where: { status: { in: [CohortStatus.OPEN, CohortStatus.RUNNING] } },
    orderBy: { startsOn: "asc" },
    include: {
      bootcamp: { select: { name: true } },
      tracks: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!cohort) return null;

  const now = new Date();

  const [paidByTrack, heldByTrack, revenue, waitlistCount, pendingPayments] =
    await Promise.all([
      db.registration.groupBy({
        by: ["trackId"],
        where: { cohortId: cohort.id, status: RegistrationStatus.PAID },
        _count: { _all: true },
      }),
      db.registration.groupBy({
        by: ["trackId"],
        where: {
          cohortId: cohort.id,
          status: RegistrationStatus.PENDING,
          holdExpiresAt: { gt: now },
        },
        _count: { _all: true },
      }),
      db.payment.aggregate({
        where: { status: "SUCCESS", registration: { cohortId: cohort.id } },
        _sum: { baseKobo: true, feeKobo: true, totalKobo: true },
        _count: { _all: true },
      }),
      db.waitlistEntry.count({ where: { cohortId: cohort.id } }),
      db.payment.count({
        where: { status: "PENDING", registration: { cohortId: cohort.id } },
      }),
    ]);

  const paid = new Map(paidByTrack.map((r) => [r.trackId, r._count._all]));
  const held = new Map(heldByTrack.map((r) => [r.trackId, r._count._all]));

  const tracks = cohort.tracks.map((track) => {
    const paidCount = paid.get(track.id) ?? 0;
    return {
      id: track.id,
      name: track.name,
      slug: track.slug,
      status: track.status,
      capacity: track.capacity,
      minEnrollment: track.minEnrollment,
      paid: paidCount,
      held: held.get(track.id) ?? 0,
      seatsLeft: Math.max(
        0,
        track.capacity - paidCount - (held.get(track.id) ?? 0),
      ),
      /** Drives the go/no-go call — PRD §9. */
      meetsMinimum: paidCount >= track.minEnrollment,
    };
  });

  return {
    cohort,
    tracks,
    totals: {
      paid: tracks.reduce((sum, t) => sum + t.paid, 0),
      held: tracks.reduce((sum, t) => sum + t.held, 0),
      capacity: tracks
        .filter((t) => t.status !== "NEXT_COHORT")
        .reduce((sum, t) => sum + t.capacity, 0),
      netKobo: revenue._sum.baseKobo ?? 0,
      feeKobo: revenue._sum.feeKobo ?? 0,
      grossKobo: revenue._sum.totalKobo ?? 0,
      paymentCount: revenue._count._all,
      pendingPayments,
      waitlistCount,
    },
  };
}

export type RegistrationFilters = {
  status?: RegistrationStatus;
  trackId?: string;
  q?: string;
};

export async function listRegistrations(filters: RegistrationFilters = {}) {
  return db.registration.findMany({
    where: {
      status: filters.status,
      trackId: filters.trackId,
      ...(filters.q
        ? {
            OR: [
              { fullName: { contains: filters.q, mode: "insensitive" } },
              { email: { contains: filters.q, mode: "insensitive" } },
              { referenceCode: { contains: filters.q, mode: "insensitive" } },
              { phone: { contains: filters.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      track: { select: { name: true } },
      priceTier: { select: { name: true } },
      payments: {
        where: { status: "SUCCESS" },
        select: { totalKobo: true, provider: true },
        take: 1,
      },
    },
  });
}

export async function listPayments(status?: string) {
  return db.payment.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      registration: {
        select: {
          id: true,
          referenceCode: true,
          fullName: true,
          email: true,
          track: { select: { name: true } },
        },
      },
    },
  });
}

export async function listWaitlist() {
  return db.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { track: { select: { name: true } } },
  });
}
