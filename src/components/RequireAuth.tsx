"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import type { ReactNode } from "react";
import SystemWindow from "./SystemWindow";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

/**
 * Guards a page. Takes state from useHunter() rather than fetching again,
 * so a protected page only ever makes one round of queries.
 *
 * Real security lives in the database (Row Level Security), not here —
 * this is purely so people see the right screen.
 */
export default function RequireAuth({
  loading,
  error,
  session,
  children,
}: {
  loading: boolean;
  error: string | null;
  session: Session | null;
  children: ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="wrap page-pad">
        <SystemWindow label="setup incomplete" variant="glow">
          <h2>Two values missing</h2>
          <p className="sys-dim">
            Create a file called <code className="mono">.env.local</code> in the project root and paste
            your Supabase project URL and anon key into it. Copy{" "}
            <code className="mono">.env.local.example</code> as a starting point, then restart{" "}
            <code className="mono">npm run dev</code>.
          </p>
          <p className="sys-faint" style={{ marginBottom: 0 }}>
            On Vercel, add the same two variables under Project Settings → Environment Variables and redeploy.
          </p>
        </SystemWindow>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wrap page-pad center">
        <span className="spinner" aria-hidden="true" />
        <p className="sys-label" style={{ marginTop: "1rem" }}>
          reading your record…
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="wrap page-pad">
        <SystemWindow label="access denied">
          <h2>You need to sign in</h2>
          <p className="sys-dim">
            Your record is tied to your account, so nothing loads until you&apos;re in.
          </p>
          <Link className="btn" href="/">
            Go to sign in
          </Link>
        </SystemWindow>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap page-pad">
        <SystemWindow label="error">
          <div className="notice notice-bad">{error}</div>
          <p className="sys-faint" style={{ marginTop: "1rem", marginBottom: 0 }}>
            If this mentions a missing table, run <code className="mono">supabase/schema.sql</code> in your
            Supabase SQL editor.
          </p>
        </SystemWindow>
      </div>
    );
  }

  return <>{children}</>;
}
