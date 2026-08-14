/**
 * Paystack fee gross-up.
 *
 * The flyer says ₦15,000 and PalmTechnIQ must net ₦15,000. Paystack deducts
 * its fee from whatever is charged, so the charge is grossed *up* rather than
 * having a fee added on top.
 *
 * Everything here is integer kobo. There is no floating-point value anywhere
 * in the payment path — `grossUp` is the only place a division happens, and
 * its result is immediately rounded to a whole naira.
 *
 * !! Verify these constants against the live merchant agreement before launch.
 *    PRD §18 item 5. They are the published NG local-card schedule as of
 *    13 August 2026.
 */

/** 1.5% of the charged amount. */
const FEE_PCT = 0.015;

/** ₦100 flat component. */
const FLAT_KOBO = 10_000;

/** The flat ₦100 is waived on transactions under ₦2,500. */
const WAIVER_THRESHOLD_KOBO = 250_000;

/** Total fee is capped at ₦2,000 however large the transaction. */
const FEE_CAP_KOBO = 200_000;

const KOBO_PER_NAIRA = 100;

export type PriceBreakdown = {
  /** What PalmTechnIQ keeps. The advertised price. */
  baseKobo: number;
  /** The processing fee, disclosed to the customer before checkout. */
  feeKobo: number;
  /** What the customer is charged. Always a whole number of naira. */
  totalKobo: number;
};

/**
 * The fee Paystack deducts from a charge of `totalKobo`.
 *
 * Note the waiver tests the *charged* amount, which is what Paystack actually
 * looks at — not the net. At bootcamp price points the distinction never
 * bites, but getting it backwards would silently under-collect on any future
 * sub-₦2,500 product.
 */
export function paystackFee(totalKobo: number): number {
  const flat = totalKobo < WAIVER_THRESHOLD_KOBO ? 0 : FLAT_KOBO;
  const fee = Math.ceil(FEE_PCT * totalKobo) + flat;
  return Math.min(fee, FEE_CAP_KOBO);
}

/**
 * Given the amount PalmTechnIQ must net, return what to charge.
 *
 * Rounds the charge up to a whole naira so the customer sees ₦15,330 rather
 * than ₦15,329.95. The rounding only ever increases what is collected, so the
 * net is never short.
 *
 * @example
 * grossUp(1_500_000) // ₦15,000 net → { fee: ₦330,  total: ₦15,330 }
 * grossUp(3_000_000) // ₦30,000 net → { fee: ₦559,  total: ₦30,559 }
 */
export function grossUp(netKobo: number): PriceBreakdown {
  if (!Number.isInteger(netKobo) || netKobo < 0) {
    throw new Error(`grossUp expects a non-negative integer kobo amount, got ${netKobo}`);
  }
  if (netKobo === 0) {
    return { baseKobo: 0, feeKobo: 0, totalKobo: 0 };
  }

  // Solve total - fee(total) >= net for the smallest total. The flat component
  // is a step function of the total, so try the no-waiver branch first and fall
  // back to the waived branch if the result lands under the threshold.
  const solve = (flat: number) => (netKobo + flat) / (1 - FEE_PCT);

  let total = ceilToNaira(solve(FLAT_KOBO));
  if (total < WAIVER_THRESHOLD_KOBO) {
    total = ceilToNaira(solve(0));
  }

  // Honour the cap: past it the fee stops growing, so the gross-up is flat.
  if (total - netKobo > FEE_CAP_KOBO) {
    total = ceilToNaira(netKobo + FEE_CAP_KOBO);
  }

  // Rounding to naira can leave the charge a hair short of covering the fee at
  // certain amounts. Nudge up a naira at a time until the net is whole.
  while (total - paystackFee(total) < netKobo && total - netKobo < FEE_CAP_KOBO) {
    total += KOBO_PER_NAIRA;
  }

  return { baseKobo: netKobo, feeKobo: total - netKobo, totalKobo: total };
}

function ceilToNaira(kobo: number): number {
  return Math.ceil(kobo / KOBO_PER_NAIRA) * KOBO_PER_NAIRA;
}

/** ₦15,330.50 → "₦15,330.50"; ₦15,330 → "₦15,330". */
export function formatNaira(kobo: number): string {
  const naira = kobo / KOBO_PER_NAIRA;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: kobo % KOBO_PER_NAIRA === 0 ? 0 : 2,
  }).format(naira);
}
