import { RegistrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCronRequest } from "@/lib/cron-auth";

/**
 * Every 5 minutes: expire PENDING registrations whose 30-minute hold has run
 * out, freeing the seat. PRD §8.
 *
 * The seat-availability read already excludes expired holds, so this is
 * bookkeeping rather than the mechanism — it keeps the registration list
 * honest and stops abandoned rows sitting PENDING forever.
 */
export async function POST(request: Request) {
  const denied = assertCronRequest(request);
  if (denied) return denied;

  const now = new Date();

  const { count } = await db.registration.updateMany({
    where: {
      status: RegistrationStatus.PENDING,
      holdExpiresAt: { lt: now, not: null },
    },
    data: {
      status: RegistrationStatus.CANCELLED,
      holdExpiresAt: null,
    },
  });

  return NextResponse.json({ released: count, at: now.toISOString() });
}

/** Vercel Cron invokes with GET; the PRD documents POST. Support both. */
export const GET = POST;
