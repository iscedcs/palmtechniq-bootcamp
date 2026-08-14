import { createHmac, timingSafeEqual } from "node:crypto";

const BASE_URL = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<PaystackEnvelope<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = (await response.json()) as PaystackEnvelope<T>;

  if (!response.ok || !body.status) {
    throw new PaystackError(
      body?.message ?? `Paystack responded ${response.status}`,
      response.status,
    );
  }

  return body;
}

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

export type InitialiseResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

/**
 * Start a transaction.
 *
 * `amountKobo` is always computed server-side by `grossUp` — never taken from
 * the client, never recomputed in the browser.
 */
export async function initialiseTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitialiseResult> {
  const { data } = await call<InitialiseResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: "NGN",
      metadata: params.metadata,
    }),
  });
  return data;
}

export type VerifyResult = {
  status: "success" | "failed" | "abandoned" | "pending" | string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  [key: string]: unknown;
};

export async function verifyTransaction(
  reference: string,
): Promise<VerifyResult> {
  const { data } = await call<VerifyResult>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return data;
}

/**
 * Verify the `x-paystack-signature` header against the raw request body.
 *
 * Must run on the *raw* body text — re-serialising the parsed JSON changes
 * key order and whitespace and the HMAC will not match.
 *
 * Comparison is constant-time: a fast-failing string compare leaks how much of
 * a forged signature was correct.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha512", secretKey())
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/** `PTQ-B26-ABCD` plus a suffix, so a retried payment gets a fresh reference. */
export function paymentReference(referenceCode: string, attempt: number): string {
  return `${referenceCode}-${attempt}`;
}
