import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admin authentication. PRD §13.2 — "authenticated against the existing
 * platform User table with a role check. No second auth system."
 *
 * There is no separate identity store here: admins sign in with the exact
 * credentials they already use on palmtechniq.com, verified against the same
 * `public."User"` rows and the same bcrypt hashes. This app never creates,
 * updates, or deletes a user.
 *
 * Why not simply share palmtechniq.com's session cookie? Because v2 issues it
 * host-only — the `domain: ".palmtechniq.com"` line in its `auth.config.ts` is
 * commented out. Turning that on would change cookie scope for every live
 * session on the main platform, which is not a change to make as a side effect
 * of shipping the bootcamp admin. The cookie name below is deliberately
 * distinct so that if that domain is ever widened, the two never collide.
 */
const ADMIN_ROLES = new Set(["ADMIN", "SUPERIOR"]);

type PlatformUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  password: string | null;
};

/**
 * Read one user from the main platform's table.
 *
 * Raw SQL, not a Prisma model, so that `public` never appears in this app's
 * Prisma schema and therefore can never appear in a generated migration. The
 * cast on `role` is because `public."UserRole"` is a Postgres enum this app
 * does not (and must not) declare.
 */
async function findPlatformUser(email: string): Promise<PlatformUser | null> {
  const rows = await db.$queryRaw<PlatformUser[]>`
    SELECT "id", "email", "name", "role"::text AS "role", "password"
    FROM "public"."User"
    WHERE lower("email") = ${email}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function findPlatformRole(id: string): Promise<string | null> {
  const rows = await db.$queryRaw<{ role: string }[]>`
    SELECT "role"::text AS "role" FROM "public"."User" WHERE "id" = ${id} LIMIT 1
  `;
  return rows[0]?.role ?? null;
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const config: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },

  pages: { signIn: "/admin/login", error: "/admin/login" },

  cookies: {
    sessionToken: {
      name: "bootcamp.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await findPlatformUser(email);

        // Verify the password even when the role is wrong, so a non-admin
        // cannot distinguish "not an admin" from "wrong password" by timing.
        const { verifyPassword } = await import("@/lib/password");
        const ok = user?.password
          ? await verifyPassword(password, user.password)
          : await verifyPassword(password, DUMMY_HASH).then(() => false);

        if (!ok || !user || !ADMIN_ROLES.has(user.role)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      }

      // Re-check the role on every rotation. An admin demoted on the main
      // platform must lose access here without waiting out their session.
      if (token.sub) {
        const role = await findPlatformRole(token.sub);
        if (!role || !ADMIN_ROLES.has(role)) {
          return null;
        }
        token.role = role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

/** A valid bcrypt hash of a value nothing matches, to equalise timing. */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const { handlers, auth, signIn, signOut } = NextAuth(config);

/** Throws unless the caller is a signed-in admin. Use in every admin loader. */
export async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user?.id || !role || !ADMIN_ROLES.has(role)) {
    throw new Error("UNAUTHORISED");
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role,
  };
}
