"use client";

import { useState } from "react";
import Link from "next/link";
import SystemWindow from "@/components/SystemWindow";
import RequireAuth from "@/components/RequireAuth";
import RankBadge from "@/components/RankBadge";
import StatBar from "@/components/StatBar";
import { useHunter } from "@/lib/useHunter";
import { recordTrial } from "@/lib/db";
import {
  didRankUp,
  formatSeconds,
  measureDeltas,
  type Measures,
  type Stats,
} from "@/lib/game";

const FIELDS: { key: keyof Measures; label: string; unit: string; max: number }[] = [
  { key: "pushups", label: "Max push-ups (one set)", unit: "reps", max: 500 },
  { key: "squats", label: "Max squats (one set)", unit: "reps", max: 1000 },
  { key: "plankSeconds", label: "Longest plank", unit: "seconds", max: 1800 },
  { key: "cardioSeconds", label: "Continuous jog / walk / wall-sit", unit: "seconds", max: 7200 },
];

interface Outcome {
  stats: Stats;
  rank: string;
  previousPower: number;
  rankedUp: boolean;
  deltas: Measures;
}

export default function TrialPage() {
  const hunter = useHunter();

  const [values, setValues] = useState<Measures>({
    pushups: 0,
    squats: 0,
    plankSeconds: 0,
    cardioSeconds: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const previous = hunter.latestMeasures;

  /* Trials are permanent, so guard the two ways someone destroys their own
     record by accident: submitting a blank form, or leaving a field at 0
     when they clearly managed something last time. */
  const anyValue = (Object.keys(values) as (keyof Measures)[]).some((k) => values[k] > 0);
  const suspiciousZeros = previous
    ? FIELDS.filter((f) => values[f.key] === 0 && previous[f.key] > 0)
    : [];

  function setValue(key: keyof Measures, raw: string, max: number) {
    const n = Math.max(0, Math.min(max, Math.floor(Number(raw) || 0)));
    setConfirming(false);
    setValues((v) => ({ ...v, [key]: n }));
  }

  async function submit() {
    if (!hunter.session?.user) return;
    if (suspiciousZeros.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await recordTrial({
        userId: hunter.session.user.id,
        measures: values,
        isBaseline: false,
      });
      setOutcome({
        stats: res.stats,
        rank: res.rank,
        previousPower: res.previousPower,
        rankedUp: didRankUp(res.previousPower, res.stats.power),
        deltas: measureDeltas(previous, values),
      });
      await hunter.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the trial.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth loading={hunter.loading} error={hunter.error} session={hunter.session}>
      <div className="wrap page-pad stack-lg">
        {/* -------------------- result screen --------------------- */}
        {outcome ? (
          <SystemWindow label={outcome.rankedUp ? "rank up" : "trial recorded"} variant="glow">
            {outcome.rankedUp ? (
              <>
                <h1 className="rankup" style={{ color: "var(--gold)" }}>
                  RANK UP
                </h1>
                <p className="lead">
                  You measurably improved. Not a badge for showing up — a real change in what your body
                  can do.
                </p>
              </>
            ) : (
              <>
                <h2>Recorded</h2>
                <p className="lead">
                  {outcome.stats.power > outcome.previousPower
                    ? "Your power went up. Not enough for the next rank yet — keep the streak alive and re-test in two weeks."
                    : "No improvement this time. That is real information, not a failure: check your rest, your protein, and whether the daily quests were actually hard enough."}
                </p>
              </>
            )}

            <div className="row" style={{ margin: "1.25rem 0" }}>
              <RankBadge rankId={outcome.rank} animate={outcome.rankedUp} />
              <div>
                <div className="sys-label">power</div>
                <div className="big-num mono">
                  {outcome.stats.power}
                  <span
                    className="statbar-delta"
                    style={{
                      color:
                        outcome.stats.power > outcome.previousPower
                          ? "var(--stat-stamina)"
                          : outcome.stats.power < outcome.previousPower
                          ? "var(--danger)"
                          : "var(--ink-faint)",
                      fontSize: "1rem",
                    }}
                  >
                    {outcome.stats.power - outcome.previousPower >= 0 ? "+" : ""}
                    {outcome.stats.power - outcome.previousPower}
                  </span>
                </div>
              </div>
            </div>

            <div className="stack">
              <StatBar name="Strength" value={outcome.stats.strength} colorVar="--stat-strength" />
              <StatBar name="Core" value={outcome.stats.core} colorVar="--stat-core" />
              <StatBar name="Stamina" value={outcome.stats.stamina} colorVar="--stat-stamina" />
              <StatBar name="Willpower" value={outcome.stats.willpower} colorVar="--stat-willpower" />
            </div>

            <hr className="divider" />

            <div className="sys-label" style={{ marginBottom: "0.6rem" }}>
              what actually changed
            </div>
            <table className="tbl">
              <tbody>
                <tr>
                  <td>Push-ups</td>
                  <td>{signed(outcome.deltas.pushups)} reps</td>
                </tr>
                <tr>
                  <td>Squats</td>
                  <td>{signed(outcome.deltas.squats)} reps</td>
                </tr>
                <tr>
                  <td>Plank</td>
                  <td>{signed(outcome.deltas.plankSeconds)} sec</td>
                </tr>
                <tr>
                  <td>Engine</td>
                  <td>{signed(outcome.deltas.cardioSeconds)} sec</td>
                </tr>
              </tbody>
            </table>

            <div className="row" style={{ marginTop: "1.5rem" }}>
              <Link className="btn" href="/dashboard">
                Back to today
              </Link>
            </div>
          </SystemWindow>
        ) : !hunter.awakened ? (
          <SystemWindow label="no baseline" variant="glow">
            <h2>Take the awakening test first</h2>
            <p className="sys-dim">
              There is nothing to compare a trial against until you have a baseline.
            </p>
            <Link className="btn" href="/awakening">
              Take the awakening test
            </Link>
          </SystemWindow>
        ) : !hunter.trialDue ? (
          <SystemWindow label="trial locked" variant="glow">
            <h2>
              {hunter.daysToTrial} day{hunter.daysToTrial === 1 ? "" : "s"} to go
            </h2>
            <p className="lead">
              Trials are every 14 days on purpose. Long enough for your body to actually adapt, short
              enough that you don&apos;t lose interest. Testing early would just measure noise.
            </p>
            <div className="notice">
              Meanwhile: keep logging daily quests. Days trained between trials is what feeds
              Willpower — the one stat you cannot cram for.
            </div>
            <div className="row" style={{ marginTop: "1.25rem" }}>
              <Link className="btn btn-ghost" href="/dashboard">
                Back to today
              </Link>
            </div>
          </SystemWindow>
        ) : (
          /* -------------------- the test form -------------------- */
          <SystemWindow label="trial · re-test" variant="glow">
            <h2>Measure yourself again</h2>
            <p className="lead">
              Same four tests, same form as your baseline. This is the only place your stats can change,
              so give it a real effort — and be honest, because you are the only person you&apos;d be
              fooling.
            </p>

            {previous && (
              <div className="notice" style={{ marginBottom: "1.25rem" }}>
                <div className="sys-label" style={{ marginBottom: "0.4rem" }}>
                  last time
                </div>
                <span className="mono">
                  {previous.pushups} push-ups · {previous.squats} squats ·{" "}
                  {formatSeconds(previous.plankSeconds)} plank · {formatSeconds(previous.cardioSeconds)}{" "}
                  engine
                </span>
              </div>
            )}

            {FIELDS.map((f) => (
              <label className="field" key={f.key}>
                <span className="field-label">
                  {f.label} ({f.unit})
                </span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={f.max}
                  value={values[f.key] || ""}
                  placeholder="0"
                  onChange={(e) => setValue(f.key, e.target.value, f.max)}
                />
              </label>
            ))}

            {error && <div className="notice notice-bad">{error}</div>}

            {confirming && suspiciousZeros.length > 0 && (
              <div className="notice notice-warn">
                You left{" "}
                <strong>{suspiciousZeros.map((f) => f.label.toLowerCase()).join(", ")}</strong> at zero,
                but you managed more than that last time. A trial cannot be edited or deleted once
                submitted, so this would drop your stats permanently. Fix it, or press again to submit
                anyway.
              </div>
            )}

            <button
              className="btn btn-gold btn-block"
              onClick={submit}
              disabled={busy || !anyValue}
              style={{ marginTop: "0.5rem" }}
            >
              {busy
                ? "measuring…"
                : !anyValue
                ? "Enter at least one number"
                : confirming
                ? "Submit anyway"
                : "Submit trial"}
            </button>
            <p className="sys-faint" style={{ fontSize: "0.8rem", marginTop: "0.75rem", marginBottom: 0 }}>
              Trials are permanent and cannot be edited or deleted.
            </p>
          </SystemWindow>
        )}

        {/* --------------------- trial history -------------------- */}
        {hunter.trials.length > 0 && (
          <SystemWindow label="trial history" variant="quiet">
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>date</th>
                    <th>rank</th>
                    <th>power</th>
                    <th>push</th>
                    <th>squat</th>
                    <th>plank</th>
                    <th>engine</th>
                  </tr>
                </thead>
                <tbody>
                  {hunter.trials.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.taken_at).toLocaleDateString()}</td>
                      <td className={`rank-${t.rank}`}>
                        {t.rank}
                        {t.is_baseline ? " ·base" : ""}
                      </td>
                      <td>{t.power}</td>
                      <td>{t.pushups}</td>
                      <td>{t.squats}</td>
                      <td>{formatSeconds(t.plank_seconds)}</td>
                      <td>{formatSeconds(t.cardio_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sys-faint" style={{ fontSize: "0.8rem", marginTop: "0.9rem", marginBottom: 0 }}>
              Append-only. This table is the proof that your rank was earned.
            </p>
          </SystemWindow>
        )}
      </div>
    </RequireAuth>
  );
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
