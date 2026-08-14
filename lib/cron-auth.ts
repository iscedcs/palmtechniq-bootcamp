import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * These endpoints confirm payments and cancel registrations. They must not be
 * callable by anyone who finds the URL.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Returns a response
 * to send when the request is not authorised, or null when it is.
 */
export function assertCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run cron endpoint");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  return null;
}
