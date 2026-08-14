import { NextResponse } from "next/server";
import { formatReferenceCode, normaliseCode } from "@/lib/codes";
import { db } from "@/lib/db";

/**
 * Public lookup by reference code. PRD §13.3.
 *
 * The reference code is the only credential a student has, so this returns
 * the minimum needed to confirm "yes, this is your registration and here is
 * its state" — no phone number, no date of birth, no guardian details, no
 * payment references. Someone who guesses a code should learn nothing worth
 * having.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ referenceCode: string }> },
) {
  const { referenceCode } = await context.params;
  const code = formatReferenceCode(normaliseCode(decodeURIComponent(referenceCode)));

  const registration = await db.registration.findUnique({
    where: { referenceCode: code },
    select: {
      referenceCode: true,
      fullName: true,
      status: true,
      createdAt: true,
      holdExpiresAt: true,
      track: { select: { name: true, slug: true, slotStart: true, slotEnd: true } },
      cohort: {
        select: {
          name: true,
          venueName: true,
          venueAddress: true,
          orientationAt: true,
          totalSessions: true,
          minAttendance: true,
        },
      },
      attendance: { select: { status: true } },
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionsAttended = registration.attendance.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE",
  ).length;

  const { attendance: _attendance, ...rest } = registration;

  return NextResponse.json(
    { ...rest, sessionsAttended },
    { headers: { "Cache-Control": "no-store" } },
  );
}
