/**
 * Prove the Resend configuration works end to end.
 *
 *   pnpm exec tsx scripts/send-test-email.ts you@example.com
 *
 * `lib/email.ts` deliberately swallows send failures so a receipt that fails
 * to send can never roll back a payment that succeeded. The cost is that
 * failures are invisible — you get silence, exactly like a send that worked.
 *
 * So this script does two passes: first a direct call to Resend with the error
 * surfaced (the actual diagnostic), then the three real templates through the
 * normal code path (to check they render and address correctly).
 *
 * Wrapped in a function rather than using top-level await: package.json has no
 * `"type": "module"`, so tsx compiles this to CJS, where top-level await is a
 * syntax error.
 */
import * as dotenv from "dotenv";
import { Resend } from "resend";
import {
  sendPaymentReceipt,
  sendRegistrationHeld,
  sendRegistrationPending,
} from "../lib/email";

dotenv.config();

const REF = "PTQ-B26-TEST";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2620";

async function main() {
  const to = process.argv[2];

  if (!to || !to.includes("@")) {
    console.error(
      "Usage: pnpm exec tsx scripts/send-test-email.ts you@example.com",
    );
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — nothing would be sent.");
    process.exit(1);
  }

  const from =
    process.env.EMAIL_FROM ?? "PalmTechnIQ Bootcamp <bootcamp@palmtechniq.com>";

  console.log(`Sending as: ${from}`);
  console.log(`Sending to: ${to}\n`);

  // ---- Pass 1: direct, with the real error surfaced -----------------------
  console.log("Probing Resend directly…");
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "PalmTechnIQ Bootcamp — configuration test",
    html: "<p>If this arrived, Resend and the sending domain are configured correctly.</p>",
  });

  if (error) {
    console.error(`\n  REJECTED: ${error.name} — ${error.message}\n`);
    console.error("  Most likely causes:");
    console.error(
      `    * the domain in EMAIL_FROM (${from.match(/@([^>]+)/)?.[1] ?? "?"}) is not verified in Resend`,
    );
    console.error("    * the API key belongs to a different Resend account");
    console.error(
      "    * the key is restricted to sending only (check its permissions)",
    );
    process.exit(1);
  }

  console.log(`  accepted, id ${data?.id}\n`);

  // ---- Pass 2: the real templates ----------------------------------------
  console.log("Sending the three transactional templates…");

  await sendRegistrationPending({
    to,
    firstName: "Test",
    referenceCode: REF,
    trackName: "Coding",
    paymentUrl: "https://checkout.paystack.com/example",
    totalFormatted: "₦15,330",
  });
  console.log("  1/3 registration pending");

  await sendRegistrationHeld({
    to,
    firstName: "Test",
    referenceCode: REF,
    trackName: "Coding",
    totalFormatted: "₦15,330",
    portalUrl: `${APP_URL}/r/${REF}`,
  });
  console.log("  2/3 registration held (payment provider unreachable)");

  await sendPaymentReceipt({
    to,
    firstName: "Test",
    referenceCode: REF,
    trackName: "Coding",
    baseFormatted: "₦15,000",
    feeFormatted: "₦330",
    totalFormatted: "₦15,330",
    whatsappGroupUrl: null,
    portalUrl: `${APP_URL}/r/${REF}`,
  });
  console.log("  3/3 payment receipt");

  console.log("\nExpect 4 emails. Check spam — a new sending domain often lands there.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
