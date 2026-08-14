import { redirect } from "next/navigation";
import { PaymentStatus } from "@prisma/client";
import { confirmPayment, releasePayment } from "@/lib/finalise-payment";
import { sendReceiptFor } from "@/lib/notify";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/**
 * Where Paystack sends the browser back to. PRD §7.4 step 7.
 *
 * Verifies server-side and runs the same idempotent finalisation as the
 * webhook, so the customer sees their confirmation immediately rather than
 * waiting for a webhook that may be seconds or minutes behind.
 */
export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref;

  if (!reference) {
    return <Problem message="We couldn't tell which payment this was." />;
  }

  // `redirect()` works by throwing, so the success path must resolve to a
  // value here and redirect *outside* the try — otherwise the catch below
  // swallows the redirect and shows the customer a holding message instead of
  // their confirmation.
  let settled: Settled;
  try {
    settled = await settle(reference);
  } catch {
    // Paystack unreachable. The reconciliation cron will settle this within
    // fifteen minutes, so do not tell the customer anything alarming.
    return (
      <Problem message="We're confirming your payment with Paystack. This can take a moment — we'll email you as soon as it's done." />
    );
  }

  switch (settled.kind) {
    case "paid":
      redirect(`/success/${settled.referenceCode}`);
    // eslint-disable-next-line no-fallthrough -- redirect() never returns
    case "stuck":
      return (
        <Problem message="Your payment went through but we couldn't finish setting up your seat. We've been alerted — please keep this page open and contact us." />
      );
    case "declined":
      return (
        <Problem
          message="That payment didn't go through. Nothing was charged — you can try again."
          retry
        />
      );
    case "pending":
      return (
        <Problem message="Your payment is still processing. We'll email you the moment it clears." />
      );
  }
}

type Settled =
  | { kind: "paid"; referenceCode: string }
  | { kind: "stuck" }
  | { kind: "declined" }
  | { kind: "pending" };

async function settle(reference: string): Promise<Settled> {
  const transaction = await verifyTransaction(reference);

  if (transaction.status === "success") {
    const outcome = await confirmPayment({
      reference,
      paidKobo: transaction.amount,
      channel: transaction.channel,
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
      rawPayload: transaction as never,
    });

    // Only the first path to finalise sends the receipt. The webhook may well
    // have got here first.
    if (outcome.result === "confirmed") {
      await sendReceiptFor(outcome.registrationId);
    }

    if (
      outcome.result === "confirmed" ||
      outcome.result === "already-confirmed"
    ) {
      return { kind: "paid", referenceCode: outcome.referenceCode };
    }

    return { kind: "stuck" };
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
    return { kind: "declined" };
  }

  return { kind: "pending" };
}

function Problem({ message, retry = false }: { message: string; retry?: boolean }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-5 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Payment</h1>
      <p className="mt-4 leading-relaxed text-white/60">{message}</p>
      {retry && (
        <a
          href="/"
          className="mx-auto mt-8 rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black"
        >
          Try again
        </a>
      )}
    </main>
  );
}
