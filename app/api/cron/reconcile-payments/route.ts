import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { confirmPayment, releasePayment } from "@/lib/finalise-payment";
import { verifyTransaction } from "@/lib/paystack";

/**
 * Every 15 minutes: re-verify every PENDING payment older than 30 minutes.
 * PRD §7.5.
 *
 * Webhooks get dropped. This is the safety net that means no payment path
 * depends on a single delivery — a customer who paid successfully but whose
 * webhook never arrived is seated here instead of chasing support.
 */
const STALE_AFTER_MINUTES = 30;
const BATCH_SIZE = 50;

export async function POST(request: Request) {
  const denied = assertCronRequest(request);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000);

  const stale = await db.payment.findMany({
    where: {
      status: PaymentStatus.PENDING,
      provider: "PAYSTACK",
      createdAt: { lt: cutoff },
    },
    select: { reference: true },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  const summary = { checked: 0, confirmed: 0, released: 0, errors: 0 };

  for (const { reference } of stale) {
    summary.checked += 1;

    try {
      const transaction = await verifyTransaction(reference);

      if (transaction.status === "success") {
        const outcome = await confirmPayment({
          reference,
          paidKobo: transaction.amount,
          channel: transaction.channel,
          paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
          rawPayload: transaction as never,
        });
        if (outcome.result === "confirmed") summary.confirmed += 1;
      } else if (
        transaction.status === "failed" ||
        transaction.status === "abandoned"
      ) {
        await releasePayment({
          reference,
          status:
            transaction.status === "failed"
              ? PaymentStatus.FAILED
              : PaymentStatus.ABANDONED,
          rawPayload: transaction as never,
        });
        summary.released += 1;
      }
      // Anything else is still genuinely in flight — leave it for next run.
    } catch (error) {
      // One bad reference must not stop the batch.
      summary.errors += 1;
      console.error(`Reconciliation failed for ${reference}`, error);
    }
  }

  return NextResponse.json(summary);
}

/** Vercel Cron invokes with GET; the PRD documents POST. Support both. */
export const GET = POST;
