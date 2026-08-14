import type { Metadata } from "next";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { GridBackdrop } from "@/components/site/grid-backdrop";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const session = await auth();
  if (session?.user?.id) redirect("/admin");

  async function login(formData: FormData) {
    "use server";

    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (caught) {
      // `signIn` redirects by throwing on success, so only a genuine
      // AuthError means bad credentials. Anything else must propagate.
      if (caught instanceof AuthError) {
        redirect("/admin/login?error=credentials");
      }
      throw caught;
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      <GridBackdrop intensity="default" />

      <div className="relative w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">
          Bootcamp <span className="text-primary">admin</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          Sign in with your palmtechniq.com account. Admin access only.
        </p>

        <form action={login} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm"
            >
              {/* Deliberately does not distinguish "wrong password" from
                  "not an admin" — that difference is not the visitor's to
                  learn. */}
              Those details didn't work.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-primary px-7 py-3.5 font-semibold text-brand-black"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";
