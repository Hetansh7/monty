import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/config";
import Nav from "@/components/Nav";
import RegisterSW from "@/components/RegisterSW";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "A training system where effort keeps your streak alive but only real, measured performance can raise your rank.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: BRAND.name },
};

export const viewport: Viewport = {
  themeColor: "#08070F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded with a plain <link> on purpose: no build-time font fetch,
            so a flaky network can never fail your Vercel build. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RegisterSW />
        <Nav />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
