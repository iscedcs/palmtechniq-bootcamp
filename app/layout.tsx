import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://bootcamp.palmtechniq.com",
  ),
  title: {
    default: "PalmTechnIQ Bootcamp",
    template: "%s · PalmTechnIQ Bootcamp",
  },
  description:
    "Small-group, in-person bootcamps in Lagos. Five weeks, one skill, something to show for it.",
  openGraph: {
    type: "website",
    siteName: "PalmTechnIQ Bootcamp",
    locale: "en_NG",
  },
};

export const viewport: Viewport = {
  themeColor: "#00343d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      {/* No chrome here. The public header and footer live in
          `app/(site)/layout.tsx` so they do not wrap `/admin`, which has its
          own. */}
      <body className="min-h-screen font-sans antialiased selection:bg-primary selection:text-brand-black">
        {children}
      </body>
    </html>
  );
}
