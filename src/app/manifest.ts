import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";

/**
 * The PWA manifest — generated from BRAND so that renaming your product in
 * src/lib/config.ts also renames the icon on people's home screens. This is
 * why there is no static file in public/: two manifests would fight, and the
 * static one would win silently.
 *
 * Served at /manifest.webmanifest, which is what layout.tsx points at.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.tagline,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08070F",
    theme_color: "#08070F",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
