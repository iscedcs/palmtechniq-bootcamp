"use server";

import { PaymentProvider, PaymentStatus, RegistrationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendReceiptFor } from "@/lib/notify";

export type ActionResult = { ok: true } | { ok: false; error: string };

const offlinePaymentSchema = z.object({
  registrationId: z.string().uuid(),
  provider: z.enum(["OFFLINE", "COMP"]),
  /** Naira, as typed by the admin. Converted to kobo before it touches money. */
  amountNaira: z.coerce.number().int().min(0).max(10_000_000),
  note: z.string().trim().min(3, "Say where this payment came from").max(500),
});

/**
 * Record a payment that happened outside Paystack. PRD §7.6.
 *
 * Bank transfer is common in this market, so this is not an edge case — it is
 * a primary payment path. Same `Payment` table, same reporting, plus an audit
 * row naming the admin who recorded it.
 */
export async function recordOfflinePayment(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised" };
  }

  const parsed = offlinePaymentSchema.safeParse({
    registrationId: formData.get("registrationId"),
    provider: formData.get("provider"),
    amountNaira: formData.get("amountNaira"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form",
    };
  }

  const { registrationId, provider, amountNaira, note } = parsed.data;
  const amountKobo = amountNaira * 100;

  try {
    await db.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id: registrationId },
        select: { id: true, referenceCode: true, status: true },
      });

      if (!registration) throw new ActionError("Registration not found");
      if (registration.status === RegistrationStatus.PAID) {
        throw new ActionError("This registration is already paid");
      }

      const payment = await tx.payment.create({
        data: {
          registrationId,
          provider:
            provider === "COMP" ? PaymentProvider.COMP : PaymentProvider.OFFLINE,
          // Namespaced so it can never collide with a Paystack reference.
          reference: `${provider}-${registration.referenceCode}-${Date.now()}`,
          baseKobo: amountKobo,
          feeKobo: 0,
          totalKobo: amountKobo,
          paidKobo: amountKobo,
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          verifiedAt: new Date(),
          recordedById: admin.id,
          note,
        },
      });

      await tx.registration.update({
        where: { id: registrationId },
        data: { status: RegistrationStatus.PAID, holdExpiresAt: null },
      });

      await writeAudit(tx, {
        actorId: admin.id,
        actorEmail: admin.email,
        action:
          provider === "COMP"
            ? "payment.comp_recorded"
            : "payment.offline_recorded",
        entityType: "Registration",
        entityId: registrationId,
        before: { status: registration.status },
        after: {
          status: RegistrationStatus.PAID,
          paymentId: payment.id,
          amountKobo,
          note,
        },
      });
    });
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    console.error("recordOfflinePayment failed", error);
    return { ok: false, error: "Could not record that payment" };
  }

  // Outside the transaction: the student gets the same receipt and WhatsApp
  // link a card payer would.
  await sendReceiptFor(registrationId);

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${registrationId}`);
  revalidatePath("/admin/payments");

  return { ok: true };
}

const trackDecisionSchema = z.object({
  trackId: z.string().uuid(),
  decision: z.enum(["CONFIRMED", "CANCELLED"]),
});

/**
 * The go/no-go call. PRD §9.
 *
 * Records the decision only — it deliberately does not refund or transfer
 * anyone. Cancelling a track obliges PalmTechnIQ to offer three options per
 * §9, and those depend on refund copy still with legal (§12/A4), so they are
 * handled deliberately rather than fired automatically from a button.
 */
export async function decideTrack(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised" };
  }

  const parsed = trackDecisionSchema.safeParse({
    trackId: formData.get("trackId"),
    decision: formData.get("decision"),
  });

  if (!parsed.success) return { ok: false, error: "Check the form" };

  const { trackId, decision } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const track = await tx.track.findUnique({
        where: { id: trackId },
        select: { id: true, status: true },
      });
      if (!track) throw new ActionError("Track not found");

      await tx.track.update({ where: { id: trackId }, data: { status: decision } });

      await writeAudit(tx, {
        actorId: admin.id,
        actorEmail: admin.email,
        action: decision === "CONFIRMED" ? "track.confirmed" : "track.cancelled",
        entityType: "Track",
        entityId: trackId,
        before: { status: track.status },
        after: { status: decision },
      });
    });
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    console.error("decideTrack failed", error);
    return { ok: false, error: "Could not save that decision" };
  }

  revalidatePath("/admin");
  return { ok: true };
}

class ActionError extends Error {}
