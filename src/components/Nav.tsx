"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { getSupabase } from "@/lib/supabaseClient";

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/trial", label: "Trial" },
  { href: "/mentors", label: "Paths" },
  { href: "/support", label: "Support" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const c = getSupabase();
    if (!c) return;
    let active = true;

    c.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });

    const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
      if (active) setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const c = getSupabase();
    if (!c) return;
    await c.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <BrandMark href={signedIn ? "/dashboard" : "/"} />

        <div className="nav-links">
          {signedIn &&
            LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="nav-link"
                aria-current={pathname === l.href ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          {signedIn ? (
            <button type="button" className="nav-link" onClick={signOut} style={{ background: "none", cursor: "pointer" }}>
              Sign out
            </button>
          ) : (
            <Link href="/support" className="nav-link" aria-current={pathname === "/support" ? "page" : undefined}>
              Support
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
