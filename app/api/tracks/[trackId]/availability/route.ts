import { NextResponse } from "next/server";
import { availableSeats } from "@/lib/capacity";
import { db } from "@/lib/db";

/**
 * Live seat count for one track. PRD §13.3.
 *
 * Exists so seat counts can refresh on a short interval without blocking the
 * page render (PRD §15) — the landing page server-renders a count, and this
 * lets a client poll it afterwards.
 *
 * Public and unauthenticated, so it returns only the count, never who holds
 * the seats.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ trackId: string }> },
) {
  const { trackId } = await context.params;

  const track = await db.track.findUnique({
    where: { id: trackId },
    select: { id: true, capacity: true, status: true, minEnrollment: true },
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const seatsLeft = await availableSeats(track.id);

  return NextResponse.json(
    {
      trackId: track.id,
      capacity: track.capacity,
      seatsLeft,
      minEnrollment: track.minEnrollment,
      status: track.status,
      isOpen:
        seatsLeft > 0 &&
        (track.status === "CONFIRMED" ||
          track.status === "PROPOSED" ||
          track.status === "RUNNING"),
    },
    {
      // Short enough that scarcity stays honest, long enough that a page full
      // of cards polling does not become a load problem.
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    },
  );
}
