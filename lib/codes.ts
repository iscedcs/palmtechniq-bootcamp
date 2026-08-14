import { randomInt } from "node:crypto";

/**
 * Unambiguous alphabet: no O/0 and no I/1.
 *
 * Every code in this system gets read aloud — a reference code over the phone
 * when someone can't find their email, a check-in code shouted across the room
 * at AMG Workspace. Ambiguous glyphs cost support time.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomFrom(alphabet: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}

/**
 * `PTQ-B26-XXXX`. The B26 segment is the bootcamp year, so codes stay
 * distinguishable once a second cohort exists.
 *
 * 31^4 ≈ 924k combinations against ~30 seats — collisions are vanishingly
 * unlikely, but `Registration.referenceCode` is uniquely constrained and the
 * caller is expected to retry on a unique violation rather than trust this.
 */
export function generateReferenceCode(year = new Date().getFullYear()): string {
  const yy = String(year).slice(-2);
  return `PTQ-B${yy}-${randomFrom(ALPHABET, 4)}`;
}

/** Six characters, announced by the facilitator at the start of a session. */
export function generateCheckInCode(): string {
  return randomFrom(ALPHABET, 6);
}

/** Certificate verification code, resolving at /verify/[code]. */
export function generateVerifyCode(): string {
  return randomFrom(ALPHABET, 10);
}

/**
 * Normalise what a human typed before comparing it to a stored code.
 *
 * Since the alphabet contains none of O, 0, I or 1, there is no ambiguous pair
 * left to fold — normalisation is only about the noise people add: lowercase,
 * stray spaces, and dashes they did or didn't type.
 */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** `PTQB26ABCD` → `PTQ-B26-ABCD`, for display after a bare-typed lookup. */
export function formatReferenceCode(normalised: string): string {
  const match = /^PTQ(B\d{2})(.{4})$/.exec(normaliseCode(normalised));
  return match ? `PTQ-${match[1]}-${match[2]}` : normalised;
}
