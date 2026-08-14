import { Prisma, RegistrationStatus, TrackStatus } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { generateReferenceCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { sendRegistrationHeld, sendRegistrationPending } from "@/lib/email";
import { initialiseTransaction, paymentReference } from "@/lib/paystack";
import { formatNaira } from "@/lib/pricing";
import { resolveTier } from "@/lib/tiers";
import { registrationSchema, requiresGuardian } from "@/lib/validation";

/** PRD §7.4 — a seat is held for 30 minutes while the customer pays. */
const HOLD_MINUTES = 30;

/** Registrations allowed per email address per hour. */
const RATE_LIMIT_PER_HOUR = 5;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const trackSlug = url.searchParams.get("track");

  if (!trackSlug) {
    return NextResponse.json({ error: "Track is required" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(payload);
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

  // The track comes from the URL, and the cohort comes from the track. Neither
  // is accepted from the request body.
  const track = await db.track.findFirst({
    where: {
      slug: trackSlug,
      cohort: { status: { in: ["OPEN", "RUNNING"] } },
    },
    include: { cohort: true },
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  if (track.status === TrackStatus.NEXT_COHORT || track.status === TrackStatus.CANCELLED) {
    return NextResponse.json(
      { error: "This track is not open for registration", waitlist: true },
      { status: 409 },
    );
  }

  if (requiresGuardian(input.dateOfBirth, track.cohort.startsOn)) {
    if (!input.guardianName || !input.guardianPhone) {
      return NextResponse.json(
        {
          error: "A parent or guardian's name and phone number are required",
          fields: {
            guardianName: !input.guardianName ? ["Required for under-18s"] : [],
            guardianPhone: !input.guardianPhone ? ["Required for under-18s"] : [],
          },
        },
        { status: 422 },
      );
    }
  }

  const recent = await db.registration.count({
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

  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  // Tier resolution is authoritative and happens here, not on the page the
  // customer loaded. PRD §7.3.
  const resolved = await resolveTier(track.cohortId, track.id, now);
  if (!resolved) {
    return NextResponse.json(
      { error: "No price is currently available for this track" },
      { status: 409 },
    );
  }

  // Create the registration before touching Paystack, so an abandoned
  // checkout is always visible rather than invisible. PRD §15.
  let registration;
  try {
    registration = await db.$transaction(async (tx) => {
      const taken = await tx.registration.count({
        where: {
          trackId: track.id,
          OR: [
            { status: RegistrationStatus.PAID },
            { status: RegistrationStatus.PENDING, holdExpiresAt: { gt: now } },
          ],
        },
      });

      if (taken >= track.capacity) {
        throw new SoldOutError();
      }

      return tx.registration.create({
        data: {
          referenceCode: generateReferenceCode(now.getFullYear()),
          cohortId: track.cohortId,
          trackId: track.id,
          priceTierId: resolved.tier.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
          guardianName: input.guardianName || null,
          guardianPhone: input.guardianPhone || null,
          experience: input.experience,
          motivation: input.motivation || null,
          heardFrom: input.heardFrom || null,
          status: RegistrationStatus.PENDING,
          holdExpiresAt,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
        },
      });
    });
  } catch (error) {
    if (error instanceof SoldOutError) {
      return NextResponse.json(
        { error: "That was the last seat — this track is now full", waitlist: true },
        { status: 409 },
      );
    }
    // Reference code collision. 31^4 makes this vanishingly rare, but the
    // unique constraint is the thing we actually trust.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Please try again" },
        { status: 503 },
      );
    }
    throw error;
  }

  const reference = paymentReference(registration.referenceCode, 1);

  const payment = await db.payment.create({
    data: {
      registrationId: registration.id,
      reference,
      baseKobo: resolved.price.baseKobo,
      feeKobo: resolved.price.feeKobo,
      totalKobo: resolved.price.totalKobo,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  const firstName = registration.fullName.split(" ")[0];
  const portalUrl = `${appUrl}/r/${registration.referenceCode}`;

  let transaction;
  try {
    transaction = await initialiseTransaction({
      email: registration.email,
      amountKobo: payment.totalKobo,
      reference,
      callbackUrl: `${appUrl}/payment/callback`,
      metadata: {
        referenceCode: registration.referenceCode,
        trackName: track.name,
        cohortName: track.cohort.name,
        tierName: resolved.tier.name,
      },
    });
  } catch (error) {
    // The registration survives a Paystack outage — abandonment stays visible
    // rather than disappearing. What the customer gets is their reference
    // code, not a payment link, because there is no payment link to give.
    console.error("Paystack initialisation failed", error);

    after(() =>
      sendRegistrationHeld({
        to: registration.email,
        firstName,
        referenceCode: registration.referenceCode,
        trackName: track.name,
        totalFormatted: formatNaira(payment.totalKobo),
        portalUrl,
      }),
    );

    return NextResponse.json(
      {
        error:
          "We've saved your registration, but our card provider was unreachable — you haven't been charged. Keep the reference code below and try again in a moment, or reply to us to pay by transfer.",
        referenceCode: registration.referenceCode,
      },
      { status: 502 },
    );
  }

  // `after` rather than a bare `void`: on serverless the function can be
  // frozen the instant the response is returned, which would drop a
  // fire-and-forget promise. This defers the send until after the response is
  // flushed and keeps the runtime alive for it.
  after(() =>
    sendRegistrationPending({
      to: registration.email,
      firstName,
      referenceCode: registration.referenceCode,
      trackName: track.name,
      paymentUrl: transaction.authorization_url,
      totalFormatted: formatNaira(payment.totalKobo),
    }),
  );

  return NextResponse.json({
    referenceCode: registration.referenceCode,
    authorizationUrl: transaction.authorization_url,
    price: resolved.price,
    tierName: resolved.tier.name,
    holdExpiresAt,
  });
}

class SoldOutError extends Error {}
