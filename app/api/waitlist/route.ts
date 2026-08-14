import { CohortStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlistSchema } from "@/lib/validation";

/** Waitlist signups allowed per email address per hour. */
const RATE_LIMIT_PER_HOUR = 5;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the form",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const recent = await db.waitlistEntry.count({
    where: {
      email: input.email,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const cohort = await db.cohort.findFirst({
    where: { status: { in: [CohortStatus.OPEN, CohortStatus.RUNNING] } },
    orderBy: { startsOn: "asc" },
    select: { id: true },
  });

  // Resolve the track if one was named, but never fail the capture over it —
  // an entry with just a name and email is still a lead worth keeping.
  const track = input.trackSlug
    ? await db.track.findFirst({
        where: { slug: input.trackSlug, ...(cohort ? { cohortId: cohort.id } : {}) },
        select: { id: true, name: true },
      })
    : null;

  // A repeat signup for the same track is the same interest, not a new lead.
  const existing = await db.waitlistEntry.findFirst({
    where: {
      email: input.email,
      cohortId: cohort?.id ?? null,
      trackId: track?.id ?? null,
    },
  });

  if (existing) {
    return NextResponse.json({ ok: true, alreadyOnList: true });
  }

  await db.waitlistEntry.create({
    data: {
      cohortId: cohort?.id ?? null,
      trackId: track?.id ?? null,
      trackName: track?.name ?? input.trackName ?? input.trackSlug ?? null,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || null,
    },
  });

  return NextResponse.json({ ok: true, alreadyOnList: false });
}
