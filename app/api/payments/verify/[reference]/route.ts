import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { confirmPayment, releasePayment } from "@/lib/finalise-payment";
import { PaystackError, verifyTransaction } from "@/lib/paystack";

/**
 * The callback path's verification. PRD §7.4 step 7.
 *
 * A UX fallback, not the source of truth: the webhook may not have arrived by
 * the time the browser lands back on the site, and the customer should not be
 * shown "pending" for a payment that succeeded. Runs the same idempotent
 * finalisation, so whichever path arrives second is a no-op.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params;

  let transaction;
  try {
    transaction = await verifyTransaction(reference);
  } catch (error) {
    const status = error instanceof PaystackError ? error.httpStatus : 502;
    return NextResponse.json(
      { status: "unknown", error: "Could not verify with Paystack" },
      { status: status === 404 ? 404 : 502 },
    );
  }

  if (transaction.status === "success") {
    const outcome = await confirmPayment({
      reference,
      paidKobo: transaction.amount,
      channel: transaction.channel,
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
      rawPayload: transaction as never,
    });

    if (outcome.result === "confirmed" || outcome.result === "already-confirmed") {
      return NextResponse.json({
        status: "paid",
        referenceCode: outcome.referenceCode,
      });
    }

    return NextResponse.json(
      { status: "problem", error: "reason" in outcome ? outcome.reason : undefined },
      { status: 409 },
    );
  }

  if (transaction.status === "failed" || transaction.status === "abandoned") {
    await releasePayment({
      reference,
      status:
        transaction.status === "failed"
          ? PaymentStatus.FAILED
          : PaymentStatus.ABANDONED,
      rawPayload: transaction as never,
    });
    return NextResponse.json({ status: transaction.status });
  }

  return NextResponse.json({ status: "pending" });
}
