"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SystemWindow from "@/components/SystemWindow";
import StartupSlot from "@/components/StartupSlot";
import { BRAND } from "@/lib/config";
import { MENTORS } from "@/lib/mentors";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [checking, setChecking] = useState(true);

  /* already signed in? go straight to today's quest */
  useEffect(() => {
    const c = getSupabase();
    if (!c) {
      setChecking(false);
      return;
    }
    let active = true;
    c.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) router.replace("/dashboard");
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = getSupabase();
    if (!c) {
      setIsError(true);
      setMessage("Supabase isn't configured yet. Add your env vars and reload.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setIsError(false);

    try {
      if (mode === "signup") {
        const { data, error } = await c.auth.signUp({ email, password });
        if (error) throw error;
        // With "Confirm email" on (Supabase default) there's no session yet.
        if (!data.session) {
          setMessage("Account created. Check your email for the confirmation link, then sign in.");
          setMode("signin");
        } else {
          router.replace("/awakening");
        }
      } else {
        const { error } = await c.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="wrap page-pad center">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="wrap page-pad">
      {/* ---------------------------- hero ---------------------------- */}
      <SystemWindow label="notification" variant="glow">
        <p className="typed mono" style={{ color: "var(--glow)", margin: "0 0 1.25rem" }}>
          A system has recognised you. Rank: unassigned.
        </p>

        <h1>
          Everyone starts at <span style={{ color: "var(--rank-e)" }}>Rank E</span>.
        </h1>

        <p className="lead">
          {BRAND.tagline} Show up daily and you earn effort — that keeps your streak alive. But your
          stats only move when a timed re-test proves you actually got stronger. You cannot grind them,
          buy them, or fake them.
        </p>

        <div className="row" style={{ marginTop: "1.5rem" }}>
          <a className="btn" href="#begin">
            Take the awakening test
          </a>
          <Link className="btn btn-ghost" href="/mentors">
            See the paths
          </Link>
        </div>
      </SystemWindow>

      {/* ------------------------ how it works ----------------------- */}
      <div className="stack-lg" style={{ marginTop: "2rem" }}>
        <div className="grid-3">
          <SystemWindow label="step 01" variant="quiet">
            <h3>Awakening</h3>
            <p className="sys-dim" style={{ marginBottom: 0, fontSize: "0.92rem" }}>
              Max push-ups, max squats, longest plank, a short run. No equipment. Your real numbers
              become your starting stats — and they will be low.
            </p>
          </SystemWindow>

          <SystemWindow label="step 02" variant="quiet">
            <h3>Daily quests</h3>
            <p className="sys-dim" style={{ marginBottom: 0, fontSize: "0.92rem" }}>
              Small, scaled to your measured max, with rest days programmed in. Finishing earns effort
              XP and extends your streak. It does not touch your stats.
            </p>
          </SystemWindow>

          <SystemWindow label="step 03" variant="quiet">
            <h3>The trial</h3>
            <p className="sys-dim" style={{ marginBottom: 0, fontSize: "0.92rem" }}>
              Every 14 days you re-test. Genuinely improved? Stats rise and you rank up. Didn&apos;t?
              They stay flat. That honesty is the whole point.
            </p>
          </SystemWindow>
        </div>

        <SystemWindow label="the rule">
          <div className="grid-2">
            <div>
              <h3 style={{ color: "var(--glow)" }}>Effort XP</h3>
              <p className="sys-dim" style={{ fontSize: "0.92rem", marginBottom: 0 }}>
                Generous and forgiving. Rewards turning up. Builds your streak and your level. Can
                never raise a stat.
              </p>
            </div>
            <div>
              <h3 style={{ color: "var(--gold)" }}>Stats</h3>
              <p className="sys-dim" style={{ fontSize: "0.92rem", marginBottom: 0 }}>
                Locked between trials. Move only on measured performance. This is the number you can
                actually trust.
              </p>
            </div>
          </div>
        </SystemWindow>

        {/* --------------------- mentors preview -------------------- */}
        <SystemWindow label="choose a path">
          <div className="grid-3">
            {MENTORS.slice(0, 6).map((m) => (
              <div key={m.id}>
                <div className="mentor-glyph" aria-hidden="true">
                  {m.glyph}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>{m.archetype}</div>
                <div className="sys-faint mono" style={{ fontSize: "0.72rem" }}>
                  after {m.historicalName}
                </div>
              </div>
            ))}
          </div>
          <p className="sys-faint" style={{ fontSize: "0.82rem", margin: "1.1rem 0 0" }}>
            Every mentor is a documented historical figure in the public domain, described in our own
            words. No borrowed characters.
          </p>
        </SystemWindow>

        {/* ------------------------ auth form ----------------------- */}
        <div id="begin">
          <SystemWindow label={mode === "signup" ? "register" : "sign in"} variant="glow">
            <h2>{mode === "signup" ? "Create your record" : "Welcome back"}</h2>
            <p className="sys-dim" style={{ fontSize: "0.92rem" }}>
              {mode === "signup"
                ? "Your stats, streak and trial history are tied to this account."
                : "Pick up where you left off."}
            </p>

            <form onSubmit={submit}>
              <label className="field">
                <span className="field-label">email</span>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              <label className="field">
                <span className="field-label">password</span>
                <input
                  className="input"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="at least 6 characters"
                />
              </label>

              <button className="btn btn-block" type="submit" disabled={busy || !isSupabaseConfigured()}>
                {busy ? "working…" : mode === "signup" ? "Begin the awakening" : "Enter"}
              </button>
            </form>

            {message && (
              <div className={`notice ${isError ? "notice-bad" : ""}`} style={{ marginTop: "1rem" }}>
                {message}
              </div>
            )}

            <p style={{ marginTop: "1rem", marginBottom: 0, fontSize: "0.9rem" }}>
              {mode === "signup" ? "Already have a record? " : "First time here? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setMessage(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--glow)",
                  cursor: "pointer",
                  padding: 0,
                  font: "inherit",
                  textDecoration: "underline",
                }}
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>
          </SystemWindow>
        </div>

        {/* ------------- reserved space for your startup ------------ */}
        <StartupSlot />
      </div>
    </div>
  );
}
