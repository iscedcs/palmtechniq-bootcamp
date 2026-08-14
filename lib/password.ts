import "server-only";

/**
 * Must stay byte-compatible with palmtechniq-v2/lib/password.ts — the hashes
 * being compared were written by that file. bcryptjs, cost 10.
 *
 * This app only ever verifies. It never hashes, because it never creates or
 * updates a user.
 */
export async function verifyPassword(password: string, hash: string) {
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}
