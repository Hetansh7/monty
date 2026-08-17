"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the site can be installed on a phone
 * ("Add to home screen"). This is what gives you an "app" without paying
 * Apple's $99/yr or Google's $25 — and without their 15–30% cut.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost") return; // avoid dev caching confusion

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* install support is a bonus, never a blocker */
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
