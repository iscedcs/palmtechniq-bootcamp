import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, signOut } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/waitlist", label: "Waitlist" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate on every admin render. `proxy.ts` also blocks these
  // paths, but that is defence in depth — this is the check that counts,
  // because it runs where the data is actually read.
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/8 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-5">
          <div className="flex items-center gap-7">
            <Link href="/admin" className="text-sm font-bold tracking-tight">
              Bootcamp <span className="text-primary">admin</span>
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-white/55 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-white/35 sm:block">
              {admin.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-white/45 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
