"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemWindow from "@/components/SystemWindow";
import { useHunter } from "@/lib/useHunter";
import { setMentor } from "@/lib/db";
import { MENTORS, type Mentor } from "@/lib/mentors";

const FOCUS_LABEL: Record<Mentor["focus"], string> = {
  strength: "Strength",
  core: "Core",
  stamina: "Stamina",
  willpower: "Willpower",
  balanced: "All four, evenly",
};

const FOCUS_VAR: Record<Mentor["focus"], string> = {
  strength: "--stat-strength",
  core: "--stat-core",
  stamina: "--stat-stamina",
  willpower: "--stat-willpower",
  balanced: "--rune",
};

export default function MentorsPage() {
  const hunter = useHunter();
  const router = useRouter();

  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromAwakening, setFromAwakening] = useState(false);

  /* Read the query string off window instead of useSearchParams — that hook
     forces a Suspense boundary at build time and is a classic Vercel build
     failure. This is one line and cannot break the build. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setFromAwakening(new URLSearchParams(window.location.search).get("from") === "awakening");
  }, []);

  const current = hunter.profile?.mentor_id ?? null;
  const signedIn = Boolean(hunter.session?.user);

  async function choose(mentorId: string) {
    if (!hunter.session?.user) {
      router.push("/");
      return;
    }
    setBusy(mentorId);
    setError(null);
    try {
      await setMentor(hunter.session.user.id, mentorId);
      await hunter.refresh();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your path.");
      setBusy(null);
    }
  }

  return (
    <div className="wrap page-pad stack-lg">
      <SystemWindow label={fromAwakening ? "baseline sealed · choose a path" : "paths"} variant="glow">
        {fromAwakening && (
          <p className="typed mono" style={{ color: "var(--glow)", margin: "0 0 1.1rem" }}>
            Baseline recorded. Select a path.
          </p>
        )}
        <h1>Pick the discipline you want to borrow.</h1>
        <p className="lead">
          A path decides which stat gets emphasised and how the System talks to you. You are not
          worshipping anyone here — you are taking one specific method that a real person is documented
          to have used, and running it yourself.
        </p>
        <p className="sys-faint" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          You can change your path any time. It never alters your stats or your history.
        </p>
      </SystemWindow>

      {!signedIn && !hunter.loading && (
        <div className="notice">
          You&apos;re browsing as a guest. <Link href="/">Create a record</Link> to lock in a path.
        </div>
      )}

      {error && <div className="notice notice-bad">{error}</div>}

      <div className="grid-2">
        {MENTORS.map((m) => {
          const isCurrent = current === m.id;
          const isOpen = open === m.id;
          return (
            <SystemWindow
              key={m.id}
              label={isCurrent ? "your path" : FOCUS_LABEL[m.focus]}
              variant={isCurrent ? "glow" : "quiet"}
              right={
                <span className="mono sys-faint" style={{ fontSize: "0.7rem" }}>
                  {m.era}
                </span>
              }
            >
              <div className="row" style={{ gap: "0.9rem", alignItems: "flex-start" }}>
                <span
                  className="mentor-glyph"
                  aria-hidden="true"
                  style={{ color: `var(${FOCUS_VAR[m.focus]})` }}
                >
                  {m.glyph}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ marginBottom: "0.15rem" }}>{m.archetype}</h3>
                  <div className="sys-faint mono" style={{ fontSize: "0.74rem" }}>
                    after {m.historicalName}
                  </div>
                </div>
              </div>

              <p className="sys-dim" style={{ fontSize: "0.92rem", marginTop: "0.9rem" }}>
                {m.story}
              </p>

              <div className="notice" style={{ marginBottom: "1rem" }}>
                <div className="sys-label" style={{ marginBottom: "0.35rem" }}>
                  what it changes in the app
                </div>
                {m.mechanic}
              </div>

              {isOpen && m.publicDomainLine && (
                <blockquote className="quote">
                  {m.publicDomainLine}
                  <cite className="mono">{m.lineSource}</cite>
                </blockquote>
              )}

              <div className="row">
                <button
                  className={`btn btn-sm ${isCurrent ? "btn-ghost" : ""}`}
                  onClick={() => choose(m.id)}
                  disabled={busy !== null || isCurrent}
                >
                  {isCurrent ? "Current path" : busy === m.id ? "setting…" : "Walk this path"}
                </button>
                {m.publicDomainLine && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOpen(isOpen ? null : m.id)}
                  >
                    {isOpen ? "Hide their words" : "Their own words"}
                  </button>
                )}
              </div>
            </SystemWindow>
          );
        })}
      </div>

      <SystemWindow label="why these six" variant="quiet">
        <p className="sys-dim" style={{ fontSize: "0.92rem" }}>
          Every figure here died long ago and sits firmly in the public domain, and every description is
          written from the documented record in our own words. No borrowed characters, no anime art, no
          quotes anyone invented for them. It keeps the app legally safe to grow — and the archetypes
          hit just as hard when they belong to us.
        </p>
        <p className="sys-faint" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
          Where a saying is only traditionally attributed rather than written down by them, it says so.
        </p>
      </SystemWindow>
    </div>
  );
}
