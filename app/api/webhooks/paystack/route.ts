import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { confirmPayment, releasePayment } from "@/lib/finalise-payment";
import { sendReceiptFor } from "@/lib/notify";
import { verifyWebhookSignature } from "@/lib/paystack";

/**
 * The source of truth for payment finalisation. PRD §7.4.
 *
 * Always returns 200 once the signature checks out, including for events we
 * do not act on and for payments already confirmed. A non-2xx tells Paystack
 * to retry, and retrying a successfully-processed event achieves nothing
 * except noise.
 */
export async function POST(request: Request) {
  // Must be the raw text. Re-serialising parsed JSON changes key order and
  // whitespace, and the HMAC will not match.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    // PRD §15 — signature rejections alert immediately. They mean either a
    // misconfigured secret or someone probing the endpoint.
    console.error("Paystack webhook: signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = event.data ?? {};
  const reference = typeof data.reference === "string" ? data.reference : null;

  if (!reference) {
    return NextResponse.json({ received: true });
  }

  switch (event.event) {
    case "charge.success": {
      const outcome = await confirmPayment({
        reference,
        paidKobo: typeof data.amount === "number" ? data.amount : 0,
        channel: typeof data.channel === "string" ? data.channel : null,
        paidAt:
          typeof data.paid_at === "string" ? new Date(data.paid_at) : null,
        rawPayload: event as never,
      });

      if (outcome.result === "confirmed") {
        await sendReceiptFor(outcome.registrationId);
      }
      if (outcome.result === "failed") {
        // Do not retry — a stuck payment needs a human, not another delivery.
        console.error(
          `Paystack webhook: could not finalise ${reference}: ${outcome.reason}`,
        );
      }
      if (outcome.result === "unknown-reference") {
        console.error(`Paystack webhook: unknown reference ${reference}`);
      }
      break;
    }

    case "charge.failed": {
      await releasePayment({
        reference,
        status: PaymentStatus.FAILED,
        rawPayload: event as never,
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
