"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemWindow from "@/components/SystemWindow";
import RequireAuth from "@/components/RequireAuth";
import RankBadge from "@/components/RankBadge";
import StatBar from "@/components/StatBar";
import { useHunter } from "@/lib/useHunter";
import { completeQuest } from "@/lib/db";
import { mentorById, questLine } from "@/lib/mentors";
import { addDays, formatSeconds, toIsoDate, xpForLevel } from "@/lib/game";

export default function DashboardPage() {
  const hunter = useHunter();
  const router = useRouter();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quest = hunter.todayQuest;
  const mentor = mentorById(hunter.profile?.mentor_id);

  /* last 14 days, oldest first — the streak ribbon */
  const ribbon = useMemo(() => {
    const today = toIsoDate();
    const out: { date: string; done: boolean; kind: string | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const hit = hunter.quests.find((q) => q.quest_date === d);
      out.push({ date: d, done: Boolean(hit), kind: hit?.kind ?? null });
    }
    return out;
  }, [hunter.quests]);

  const moves = useMemo(() => {
    if (!quest) return [];
    if (quest.kind === "recovery") {
      return [
        { id: "walk", name: "Easy walk", target: `${quest.walkMinutes} min`, hard: false },
        { id: "mobility", name: "Mobility / stretching", target: `${quest.mobilityMinutes} min`, hard: false },
      ];
    }
    return [
      { id: "pushups", name: "Push-ups", target: `${quest.sets} × ${quest.pushupReps}`, hard: false },
      { id: "squats", name: "Squats", target: `${quest.sets} × ${quest.squatReps}`, hard: false },
      { id: "plank", name: "Plank hold", target: formatSeconds(quest.plankSeconds), hard: true },
      { id: "walk", name: "Walk or jog", target: `${quest.walkMinutes} min`, hard: false },
    ];
  }, [quest]);

  const allDone = moves.length > 0 && moves.every((m) => checked[m.id]);

  async function submit() {
    if (!hunter.session?.user || !quest) return;
    setBusy(true);
    setError(null);
    try {
      const res = await completeQuest({
        userId: hunter.session.user.id,
        kind: quest.kind,
        pushups: quest.kind === "training" ? quest.sets * quest.pushupReps : 0,
        squats: quest.kind === "training" ? quest.sets * quest.squatReps : 0,
        plankSeconds: quest.plankSeconds,
        walkMinutes: quest.walkMinutes,
      });
      if (res.alreadyDone) {
        setFlash("Today is already logged. Come back tomorrow.");
      } else {
        setFlash(`+${res.effortXp} effort XP · streak ${res.streak}`);
      }
      await hunter.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log your quest.");
    } finally {
      setBusy(false);
    }
  }

  /* haven't taken the baseline yet -> send them there */
  if (!hunter.loading && hunter.session && !hunter.awakened) {
    return (
      <RequireAuth loading={hunter.loading} error={hunter.error} session={hunter.session}>
        <div className="wrap page-pad">
          <SystemWindow label="no record found" variant="glow">
            <h2>You haven&apos;t been assessed yet</h2>
            <p className="sys-dim">
              Nothing here works until the System knows where you actually stand. The awakening test
              takes about five minutes and needs no equipment.
            </p>
            <button className="btn" onClick={() => router.push("/awakening")}>
              Take the awakening test
            </button>
          </SystemWindow>
        </div>
      </RequireAuth>
    );
  }

  const stats = hunter.stats;
  const xp = hunter.profile?.effort_xp ?? 0;
  const nextLevelAt = xpForLevel(hunter.level + 1);

  return (
    <RequireAuth loading={hunter.loading} error={hunter.error} session={hunter.session}>
      <div className="wrap page-pad stack-lg">
        {/* ------------------------- status ------------------------- */}
        <SystemWindow
          label="status"
          right={<span className="mono sys-faint">day {hunter.dayIndex + 1}</span>}
        >
          <div className="row-between">
            <RankBadge rankId={hunter.profile?.rank ?? "E"} />
            <div style={{ textAlign: "right" }}>
              <div className="sys-label">power</div>
              <div className="big-num mono">{stats?.power ?? 0}</div>
            </div>
          </div>

          {hunter.profile?.hunter_name && (
            <p className="mono sys-dim" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              {hunter.profile.hunter_name}
              {mentor ? ` · ${mentor.archetype}` : ""}
            </p>
          )}

          <hr className="divider" />

          <div className="stack">
            <StatBar name="Strength" value={stats?.strength ?? 0} colorVar="--stat-strength" locked={!hunter.trialDue} />
            <StatBar name="Core" value={stats?.core ?? 0} colorVar="--stat-core" locked={!hunter.trialDue} />
            <StatBar name="Stamina" value={stats?.stamina ?? 0} colorVar="--stat-stamina" locked={!hunter.trialDue} />
            <StatBar name="Willpower" value={stats?.willpower ?? 0} colorVar="--stat-willpower" locked={!hunter.trialDue} />
          </div>

          <hr className="divider" />

          {hunter.trialDue ? (
            <div className="notice notice-warn">
              <strong>Trial available.</strong> Re-test now and find out whether your stats actually
              moved.
              <div style={{ marginTop: "0.75rem" }}>
                <Link className="btn btn-gold btn-sm" href="/trial">
                  Begin trial
                </Link>
              </div>
            </div>
          ) : (
            <p className="sys-faint mono" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
              stats unlock in {hunter.daysToTrial} day{hunter.daysToTrial === 1 ? "" : "s"} · nothing you
              do today can change them
            </p>
          )}
        </SystemWindow>

        {/* ------------------------ the quest ----------------------- */}
        <SystemWindow
          label={quest?.kind === "recovery" ? "daily quest · recovery" : "daily quest"}
          variant="glow"
          right={<span className="mono sys-faint">{toIsoDate()}</span>}
        >
          {quest?.kind === "recovery" && (
            <div className="notice" style={{ marginBottom: "1rem" }}>
              Programmed rest. Muscle is built while you recover, not while you train — skipping this is
              how people burn out in week three.
            </div>
          )}

          {hunter.questDoneToday ? (
            <>
              <h2 style={{ color: "var(--stat-stamina)" }}>Logged for today</h2>
              <p className="sys-dim">{questLine(hunter.profile?.mentor_id ?? null, hunter.profile?.streak ?? 0)}</p>
            </>
          ) : (
            <>
              <div>
                {moves.map((m) => (
                  <label key={m.id} className="quest-item" style={{ cursor: "pointer" }}>
                    <span className="row" style={{ gap: "0.6rem" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(checked[m.id])}
                        onChange={(e) => setChecked((c) => ({ ...c, [m.id]: e.target.checked }))}
                        style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--glow)" }}
                      />
                      <span className="quest-move">
                        {m.name}
                        {m.hard && <span className="quest-hard">hard set</span>}
                      </span>
                    </span>
                    <span className="quest-target">{m.target}</span>
                  </label>
                ))}
              </div>

              <button className="btn btn-block" onClick={submit} disabled={busy || !allDone} style={{ marginTop: "1.25rem" }}>
                {busy ? "logging…" : allDone ? "Complete quest" : "Tick every line to complete"}
              </button>

              <p className="sys-faint" style={{ fontSize: "0.8rem", marginTop: "0.75rem", marginBottom: 0 }}>
                Earns effort XP and extends your streak. Does not touch your stats.
              </p>
            </>
          )}

          {flash && <div className="notice" style={{ marginTop: "1rem" }}>{flash}</div>}
          {error && <div className="notice notice-bad" style={{ marginTop: "1rem" }}>{error}</div>}
        </SystemWindow>

        {/* -------------------- effort + streak --------------------- */}
        <div className="grid-2">
          <SystemWindow label="effort" variant="quiet">
            <div className="row-between" style={{ alignItems: "baseline" }}>
              <div>
                <div className="sys-label">level</div>
                <div className="big-num mono">{hunter.level}</div>
              </div>
              <div className="mono sys-faint" style={{ fontSize: "0.8rem" }}>
                {xp} / {nextLevelAt} xp
              </div>
            </div>
            <div className="statbar-track" style={{ marginTop: "0.75rem" }}>
              <div
                className="statbar-fill"
                style={
                  {
                    width: `${Math.round(hunter.levelProgress * 100)}%`,
                    "--bar-color": "var(--rune)",
                  } as CSSProperties
                }
              />
            </div>
            <p className="sys-faint" style={{ fontSize: "0.8rem", marginTop: "0.75rem", marginBottom: 0 }}>
              Cosmetic on purpose. Level shows how consistent you&apos;ve been, not how strong you are.
            </p>
          </SystemWindow>

          <SystemWindow label="streak" variant="quiet">
            <div className="row-between" style={{ alignItems: "baseline" }}>
              <div>
                <div className="sys-label">current</div>
                <div className="big-num mono">{hunter.profile?.streak ?? 0}</div>
              </div>
              <div className="mono sys-faint" style={{ fontSize: "0.8rem" }}>
                best {hunter.profile?.best_streak ?? 0}
              </div>
            </div>
            <div className="streak-dots" style={{ marginTop: "0.9rem" }}>
              {ribbon.map((d) => (
                <span
                  key={d.date}
                  className={`streak-dot${d.done ? (d.kind === "recovery" ? " rest" : " on") : ""}`}
                  title={`${d.date}${d.done ? ` · ${d.kind}` : " · missed"}`}
                />
              ))}
            </div>
            <p className="sys-faint" style={{ fontSize: "0.8rem", marginTop: "0.75rem", marginBottom: 0 }}>
              Miss a day and this restarts at 1, never 0. You showed up today; that counts.
            </p>
          </SystemWindow>
        </div>

        {/* ------------------------- mentor ------------------------- */}
        {mentor ? (
          <SystemWindow label="your path" variant="quiet">
            <div className="row" style={{ gap: "1rem", alignItems: "flex-start" }}>
              <span className="mentor-glyph" aria-hidden="true">
                {mentor.glyph}
              </span>
              <div>
                <h3 style={{ marginBottom: "0.2rem" }}>{mentor.archetype}</h3>
                <div className="sys-faint mono" style={{ fontSize: "0.74rem", marginBottom: "0.6rem" }}>
                  after {mentor.historicalName} · {mentor.era}
                </div>
                <p className="sys-dim" style={{ fontSize: "0.92rem", marginBottom: 0 }}>
                  {mentor.mechanic}
                </p>
              </div>
            </div>
          </SystemWindow>
        ) : (
          <SystemWindow label="your path" variant="quiet">
            <p className="sys-dim" style={{ marginBottom: "1rem" }}>
              You haven&apos;t chosen a path yet. It changes the voice of the System and which stat gets
              emphasised.
            </p>
            <Link className="btn btn-ghost btn-sm" href="/mentors">
              Choose a path
            </Link>
          </SystemWindow>
        )}
      </div>
    </RequireAuth>
  );
}
