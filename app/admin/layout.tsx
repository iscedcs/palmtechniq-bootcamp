import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Bootcamp admin" },
  robots: { index: false, follow: false },
};

/**
 * Pass-through. The signed-in chrome lives in `(dashboard)/layout.tsx` so that
 * `/admin/login` — the one admin route an unauthenticated person must be able
 * to reach — does not render a nav bar and a sign-out button.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
