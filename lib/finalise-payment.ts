import {
  PaymentStatus,
  type Prisma,
  RegistrationStatus,
} from "@prisma/client";
import { db } from "@/lib/db";

export type FinalisationOutcome =
  | { result: "confirmed"; registrationId: string; referenceCode: string }
  | { result: "already-confirmed"; registrationId: string; referenceCode: string }
  | { result: "failed"; reason: string }
  | { result: "unknown-reference" };

/**
 * The single place a payment becomes SUCCESS and a registration becomes PAID.
 *
 * Three callers reach it — the Paystack webhook, the browser callback route,
 * and the reconciliation cron. All three will fire for a typical payment, and
 * any of them may fire twice. So:
 *
 *   - everything happens inside one transaction
 *   - the payment row is re-read inside that transaction
 *   - the transition is guarded on the payment still being PENDING
 *
 * Never blind-set a status. A second webhook delivery for an already-confirmed
 * payment must be a no-op that still returns success, or Paystack will keep
 * retrying it.
 */
export async function confirmPayment(params: {
  reference: string;
  paidKobo: number;
  channel?: string | null;
  paidAt?: Date | null;
  rawPayload?: Prisma.InputJsonValue;
}): Promise<FinalisationOutcome> {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference: params.reference },
      include: { registration: { select: { id: true, referenceCode: true } } },
    });

    if (!payment) return { result: "unknown-reference" };

    const { id: registrationId, referenceCode } = payment.registration;

    if (payment.status === PaymentStatus.SUCCESS) {
      return { result: "already-confirmed", registrationId, referenceCode };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return {
        result: "failed",
        reason: `payment ${params.reference} is ${payment.status}, not PENDING`,
      };
    }

    // Underpayment must not silently pass. Paystack sends the amount actually
    // captured; if it is short of what we asked for, leave the payment PENDING
    // and let a human look at it rather than seating someone who part-paid.
    if (params.paidKobo < payment.totalKobo) {
      return {
        result: "failed",
        reason: `underpaid: expected ${payment.totalKobo} kobo, received ${params.paidKobo}`,
      };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paidKobo: params.paidKobo,
        channel: params.channel ?? undefined,
        paidAt: params.paidAt ?? new Date(),
        verifiedAt: new Date(),
        rawPayload: params.rawPayload,
      },
    });

    await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.PAID,
        // The seat is bought, not held. Clearing this takes the registration
        // out of reach of the release-holds cron.
        holdExpiresAt: null,
      },
    });

    return { result: "confirmed", registrationId, referenceCode };
  });
}

/**
 * Mark a payment as failed or abandoned and release the seat it was holding.
 *
 * Also guarded on PENDING: a late "abandoned" notification must never undo a
 * payment that has since succeeded through another path.
 */
export async function releasePayment(params: {
  reference: string;
  status: typeof PaymentStatus.FAILED | typeof PaymentStatus.ABANDONED;
  rawPayload?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference: params.reference },
      select: { id: true, status: true, registrationId: true },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING) return;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: params.status, rawPayload: params.rawPayload },
    });

    const registration = await tx.registration.findUnique({
      where: { id: payment.registrationId },
      select: { status: true },
    });

    if (registration?.status === RegistrationStatus.PENDING) {
      await tx.registration.update({
        where: { id: payment.registrationId },
        data: {
          status: RegistrationStatus.CANCELLED,
          holdExpiresAt: null,
        },
      });
    }
  });
}
