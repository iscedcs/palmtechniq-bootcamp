import { Resend } from "resend";

/**
 * PRD §14.
 *
 * !! The PRD specifies the existing isce-mail templates. This is a Resend
 *    sender with inline markup so Phase 1 can send at all — swap the bodies
 *    for isce-mail templates once that package is available here.
 *
 * WhatsApp is the primary channel for this audience; email is the durable
 * record. Sends never throw into the request path: a receipt that fails to
 * send must not roll back a payment that succeeded.
 */

let client: Resend | null = null;

function resend(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

const FROM =
  process.env.EMAIL_FROM ?? "PalmTechnIQ Bootcamp <bootcamp@palmtechniq.com>";

async function send(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const mailer = resend();

  if (!mailer) {
    console.warn(`RESEND_API_KEY not set — skipping "${params.subject}"`);
    return;
  }

  try {
    await mailer.emails.send({ from: FROM, ...params });
  } catch (error) {
    // Log and move on. The admin resend action is the recovery path.
    console.error(`Failed to send "${params.subject}" to ${params.to}`, error);
  }
}

const shell = (body: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0f172a;line-height:1.6">
  <p style="font-size:18px;font-weight:700;margin:0 0 24px;color:#00343d">PalmTechnIQ Bootcamp</p>
  ${body}
  <p style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">
    PalmTechnIQ · Reply to this email if anything is unclear.
  </p>
</div>`;

/** Sent the moment a PENDING registration is created. */
export async function sendRegistrationPending(params: {
  to: string;
  firstName: string;
  referenceCode: string;
  trackName: string;
  paymentUrl: string;
  totalFormatted: string;
}) {
  await send({
    to: params.to,
    subject: `Your seat is held — ${params.referenceCode}`,
    html: shell(`
      <p>Hi ${escapeHtml(params.firstName)},</p>
      <p>We're holding a seat on <strong>${escapeHtml(params.trackName)}</strong> for you for the next 30 minutes.</p>
      <p style="font-size:15px">Your reference code is<br>
        <strong style="font-family:monospace;font-size:22px;letter-spacing:2px;color:#00343d">${escapeHtml(params.referenceCode)}</strong>
      </p>
      <p><a href="${params.paymentUrl}" style="display:inline-block;background:#27ba55;color:#000;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">Pay ${escapeHtml(params.totalFormatted)}</a></p>
      <p style="font-size:14px;color:#475569">Prefer bank transfer? Reply to this email and we'll send account details.</p>
    `),
  });
}

/**
 * Sent when the seat was held but Paystack could not be reached.
 *
 * Deliberately carries no payment link — there isn't one. The reference code
 * is the thing the customer needs, so it leads.
 */
export async function sendRegistrationHeld(params: {
  to: string;
  firstName: string;
  referenceCode: string;
  trackName: string;
  totalFormatted: string;
  portalUrl: string;
}) {
  await send({
    to: params.to,
    subject: `We've got your details — ${params.referenceCode}`,
    html: shell(`
      <p>Hi ${escapeHtml(params.firstName)},</p>
      <p>We saved your registration for <strong>${escapeHtml(params.trackName)}</strong>, but our card provider was unreachable just then, so you have not been charged.</p>
      <p style="font-size:15px">Your reference code is<br>
        <strong style="font-family:monospace;font-size:22px;letter-spacing:2px;color:#00343d">${escapeHtml(params.referenceCode)}</strong>
      </p>
      <p>Nothing is lost. You can try paying ${escapeHtml(params.totalFormatted)} again from your registration page:</p>
      <p><a href="${params.portalUrl}" style="display:inline-block;background:#27ba55;color:#000;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">Open my registration</a></p>
      <p style="font-size:14px;color:#475569">Or just reply to this email and we'll send bank transfer details and record the payment against your code.</p>
    `),
  });
}

/** Sent on confirmed payment, with the fee itemised. */
export async function sendPaymentReceipt(params: {
  to: string;
  firstName: string;
  referenceCode: string;
  trackName: string;
  baseFormatted: string;
  feeFormatted: string;
  totalFormatted: string;
  whatsappGroupUrl: string | null;
  portalUrl: string;
}) {
  await send({
    to: params.to,
    subject: `You're in — ${params.referenceCode}`,
    html: shell(`
      <p>Hi ${escapeHtml(params.firstName)},</p>
      <p>Your seat on <strong>${escapeHtml(params.trackName)}</strong> is confirmed.</p>
      <p style="font-size:15px">Reference code<br>
        <strong style="font-family:monospace;font-size:22px;letter-spacing:2px;color:#00343d">${escapeHtml(params.referenceCode)}</strong>
      </p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#475569">${escapeHtml(params.trackName)}</td><td style="text-align:right">${escapeHtml(params.baseFormatted)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Processing fee</td><td style="text-align:right">${escapeHtml(params.feeFormatted)}</td></tr>
        <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;font-weight:700">Total</td><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;text-align:right;font-weight:700">${escapeHtml(params.totalFormatted)}</td></tr>
      </table>
      ${
        params.whatsappGroupUrl
          ? `<p><a href="${params.whatsappGroupUrl}" style="display:inline-block;background:#27ba55;color:#000;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">Join the WhatsApp group</a></p>`
          : `<p style="font-size:14px;color:#475569">We'll send the WhatsApp group link shortly — that's where day-to-day updates happen.</p>`
      }
      <p style="font-size:14px"><a href="${params.portalUrl}" style="color:#00343d">See your schedule</a></p>
    `),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
