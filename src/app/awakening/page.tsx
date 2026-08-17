"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SystemWindow from "@/components/SystemWindow";
import RequireAuth from "@/components/RequireAuth";
import RankBadge from "@/components/RankBadge";
import StatBar from "@/components/StatBar";
import { useHunter } from "@/lib/useHunter";
import { recordTrial, setHunterName } from "@/lib/db";
import { computeStats, rankFor, type Measures } from "@/lib/game";

interface StepDef {
  key: keyof Measures;
  label: string;
  question: string;
  detail: string;
  unit: string;
  placeholder: string;
  max: number;
}

/* Four measurements, no equipment, doable in a bedroom. Deliberately the
   same four every time — a baseline is only meaningful if it's repeatable. */
const STEPS: StepDef[] = [
  {
    key: "pushups",
    label: "test 01 · upper body",
    question: "Max push-ups in one set",
    detail:
      "Good form, no pausing at the top. Stop when you cannot complete a rep — not when it starts to hurt. Knees down is fine; just do it the same way at every trial.",
    unit: "reps",
    placeholder: "0",
    max: 500,
  },
  {
    key: "squats",
    label: "test 02 · lower body",
    question: "Max bodyweight squats in one set",
    detail: "Thighs to roughly parallel, heels down, controlled. Stop at genuine failure.",
    unit: "reps",
    placeholder: "0",
    max: 1000,
  },
  {
    key: "plankSeconds",
    label: "test 03 · core",
    question: "Longest plank hold",
    detail: "Elbows under shoulders, hips level. The clock stops when your hips drop.",
    unit: "seconds",
    placeholder: "0",
    max: 1800,
  },
  {
    key: "cardioSeconds",
    label: "test 04 · engine",
    question: "Continuous jog, brisk walk, or wall-sit",
    detail:
      "How many seconds could you keep going without stopping? Any of the three — just use the same one every trial.",
    unit: "seconds",
    placeholder: "0",
    max: 7200,
  },
];

export default function AwakeningPage() {
  const hunter = useHunter();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Measures>({
    pushups: 0,
    squats: 0,
    plankSeconds: 0,
    cardioSeconds: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = STEPS.length + 1; // + review
  const onReview = step === STEPS.length;
  const preview = computeStats(values, 0);
  const previewRank = rankFor(preview.power);

  function setValue(key: keyof Measures, raw: string, max: number) {
    const n = Math.max(0, Math.min(max, Math.floor(Number(raw) || 0)));
    setValues((v) => ({ ...v, [key]: n }));
  }

  async function finish() {
    if (!hunter.session?.user) return;
    setBusy(true);
    setError(null);
    try {
      if (name.trim()) await setHunterName(hunter.session.user.id, name.trim());
      await recordTrial({ userId: hunter.session.user.id, measures: values, isBaseline: true });
      await hunter.refresh();
      router.replace("/mentors?from=awakening");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your baseline.");
      setBusy(false);
    }
  }

  return (
    <RequireAuth loading={hunter.loading} error={hunter.error} session={hunter.session}>
      <div className="wrap page-pad">
        {/* Already awakened? Don't let them overwrite the baseline — the
            whole point is that history is immutable. */}
        {hunter.awakened ? (
          <SystemWindow label="already awakened" variant="glow">
            <h2>Your baseline is set</h2>
            <p className="sys-dim">
              A baseline can only be taken once — otherwise none of your progress would mean anything.
              Re-tests happen at Trials.
            </p>
            <button className="btn" onClick={() => router.push("/dashboard")}>
              Go to today
            </button>
          </SystemWindow>
        ) : (
          <>
            <div className="row-between" style={{ marginBottom: "1rem" }}>
              <span className="sys-label">awakening · {Math.min(step + 1, total)} of {total}</span>
              <span className="mono sys-faint">no equipment needed</span>
            </div>

            {!onReview ? (
              <SystemWindow label={STEPS[step].label} variant="glow">
                <h2>{STEPS[step].question}</h2>
                <p className="sys-dim">{STEPS[step].detail}</p>

                <label className="field">
                  <span className="field-label">{STEPS[step].unit}</span>
                  <input
                    className="input input-lg"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={STEPS[step].max}
                    value={values[STEPS[step].key] || ""}
                    placeholder={STEPS[step].placeholder}
                    onChange={(e) => setValue(STEPS[step].key, e.target.value, STEPS[step].max)}
                    autoFocus
                  />
                  <span className="hint">
                    Be honest. A low number here is not embarrassing — it is the only way your progress
                    can be real later.
                  </span>
                </label>

                <div className="row">
                  {step > 0 && (
                    <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                      Back
                    </button>
                  )}
                  <button className="btn" onClick={() => setStep(step + 1)}>
                    {step === STEPS.length - 1 ? "See my rank" : "Next"}
                  </button>
                </div>
              </SystemWindow>
            ) : (
              <SystemWindow label="assessment complete" variant="glow">
                <h2>Your starting record</h2>

                <div className="row" style={{ margin: "1.25rem 0" }}>
                  <RankBadge rankId={previewRank.id} animate />
                  <div>
                    <div className="sys-label">power</div>
                    <div className="big-num mono">{preview.power}</div>
                  </div>
                </div>

                <div className="stack" style={{ marginBottom: "1.5rem" }}>
                  <StatBar name="Strength" value={preview.strength} colorVar="--stat-strength" />
                  <StatBar name="Core" value={preview.core} colorVar="--stat-core" />
                  <StatBar name="Stamina" value={preview.stamina} colorVar="--stat-stamina" />
                  <StatBar name="Willpower" value={preview.willpower} colorVar="--stat-willpower" />
                </div>

                <div className="notice">
                  Willpower is <strong>0</strong> and that is correct. It is the one stat that cannot be
                  measured on day one — it comes from days trained between trials. You earn it by
                  turning up.
                </div>

                <label className="field" style={{ marginTop: "1.25rem" }}>
                  <span className="field-label">what should the system call you? (optional)</span>
                  <input
                    className="input"
                    type="text"
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="your name or handle"
                  />
                </label>

                {error && <div className="notice notice-bad">{error}</div>}

                <div className="row" style={{ marginTop: "1rem" }}>
                  <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>
                    Back
                  </button>
                  <button className="btn btn-gold" onClick={finish} disabled={busy}>
                    {busy ? "sealing record…" : "Lock in my baseline"}
                  </button>
                </div>

                <p className="sys-faint" style={{ fontSize: "0.82rem", marginTop: "1rem", marginBottom: 0 }}>
                  Once locked, this cannot be edited. That is what makes your next trial mean something.
                </p>
              </SystemWindow>
            )}
          </>
        )}
      </div>
    </RequireAuth>
  );
}
