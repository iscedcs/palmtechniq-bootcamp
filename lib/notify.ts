import { db } from "@/lib/db";
import { sendPaymentReceipt } from "@/lib/email";
import { formatNaira } from "@/lib/pricing";

/**
 * Send the receipt for a freshly-confirmed registration.
 *
 * Called only on a `confirmed` outcome, never on `already-confirmed` — the
 * webhook, the callback and the reconciliation cron all reach the same
 * finalisation, and only the first of them should produce an email.
 *
 * Never throws. A failed send must not turn a successful payment into an
 * error response that makes Paystack retry.
 */
export async function sendReceiptFor(registrationId: string): Promise<void> {
  try {
    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: {
        track: { select: { name: true } },
        cohort: { select: { whatsappGroupUrl: true } },
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const payment = registration?.payments[0];
    if (!registration || !payment) return;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://bootcamp.palmtechniq.com";

    await sendPaymentReceipt({
      to: registration.email,
      firstName: registration.fullName.split(" ")[0],
      referenceCode: registration.referenceCode,
      trackName: registration.track.name,
      baseFormatted: formatNaira(payment.baseKobo),
      feeFormatted: formatNaira(payment.feeKobo),
      totalFormatted: formatNaira(payment.totalKobo),
      whatsappGroupUrl: registration.cohort.whatsappGroupUrl,
      portalUrl: `${appUrl}/r/${registration.referenceCode}`,
    });
  } catch (error) {
    console.error(`Failed to send receipt for ${registrationId}`, error);
  }
}
