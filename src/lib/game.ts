// =====================================================================
//  GAME LOGIC — pure functions, no React, no network, no browser APIs.
//  Kept deliberately dependency-free so it can be unit-tested on its own
//  (see  verify/game.test.mjs ) and so the rules live in exactly one place.
//
//  THE ONE RULE THAT MATTERS:
//    Effort XP is earned for SHOWING UP and can never move a stat.
//    Stats move only inside recordTrial(), from real measured numbers.
//  Keep those two apart and the progression stays honest — that honesty
//  is the product. Blur them and you've built another points app.
// =====================================================================

/* ---------------------------------- types --------------------------- */

export type RankId = "E" | "D" | "C" | "B" | "A" | "S";
export type QuestKind = "training" | "recovery";

/** Raw, self-measured performance from a Trial. Nothing here is a guess. */
export interface Measures {
  pushups: number;
  squats: number;
  plankSeconds: number;
  cardioSeconds: number;
}

export interface Stats {
  strength: number;
  core: number;
  stamina: number;
  willpower: number;
  power: number;
}

export interface Quest {
  kind: QuestKind;
  sets: number;
  pushupReps: number;
  squatReps: number;
  plankSeconds: number;
  walkMinutes: number;
  mobilityMinutes: number;
}

export interface Tuning {
  trialIntervalDays: number;
  recoveryEveryNthDay: number;
  workingSetFraction: number;
}

/** Fallbacks only. The app passes TUNING from src/lib/config.ts, which wins. */
export const DEFAULT_TUNING: Tuning = {
  trialIntervalDays: 14,
  recoveryEveryNthDay: 4,
  workingSetFraction: 0.4,
};

/* ------------------------------- stat curves ------------------------ */

/**
 * Saturating curve: 100 * v / (v + k).
 * Chosen over a linear "percent of some max" on purpose — early reps move
 * the needle a lot (beginners need visible wins) and it never hits 100,
 * so there is always somewhere left to climb. No artificial ceiling.
 */
export function saturate(value: number, k: number): number {
  const v = Math.max(0, value);
  if (v === 0) return 0;
  return (100 * v) / (v + k);
}

export const CURVE = {
  pushupsK: 40,
  squatsK: 60,
  plankK: 120,
  cardioK: 300,
} as const;

/**
 * Turns raw measurements into stats.
 * `consistency` (0..1) is the share of days trained since the last Trial —
 * it is the ONLY input to Willpower, so Willpower literally cannot be
 * bought or rushed. It is earned by turning up.
 */
export function computeStats(m: Measures, consistency: number): Stats {
  const c = clamp(consistency, 0, 1);

  const strength = Math.round(
    0.6 * saturate(m.pushups, CURVE.pushupsK) + 0.4 * saturate(m.squats, CURVE.squatsK)
  );
  const core = Math.round(saturate(m.plankSeconds, CURVE.plankK));
  const stamina = Math.round(saturate(m.cardioSeconds, CURVE.cardioK));
  const willpower = Math.round(100 * c);

  const power = Math.round(0.35 * strength + 0.2 * core + 0.25 * stamina + 0.2 * willpower);

  return { strength, core, stamina, willpower, power };
}

/* ---------------------------------- ranks --------------------------- */

export interface RankDef {
  id: RankId;
  min: number;
  title: string;
  /** CSS custom-property name used for this rank's colour. */
  colorVar: string;
}

/** Everyone starts at E. That weak start is the hook, not a bug. */
export const RANKS: RankDef[] = [
  { id: "E", min: 0, title: "Unranked", colorVar: "--rank-e" },
  { id: "D", min: 12, title: "Initiate", colorVar: "--rank-d" },
  { id: "C", min: 25, title: "Adept", colorVar: "--rank-c" },
  { id: "B", min: 40, title: "Veteran", colorVar: "--rank-b" },
  { id: "A", min: 55, title: "Elite", colorVar: "--rank-a" },
  { id: "S", min: 70, title: "Ascendant", colorVar: "--rank-s" },
];

export function rankFor(power: number): RankDef {
  let out = RANKS[0];
  for (const r of RANKS) if (power >= r.min) out = r;
  return out;
}

export function rankIndex(id: RankId): number {
  return RANKS.findIndex((r) => r.id === id);
}

/** Did this trial cross a rank boundary? Drives the rank-up moment. */
export function didRankUp(previousPower: number, newPower: number): boolean {
  return rankIndex(rankFor(newPower).id) > rankIndex(rankFor(previousPower).id);
}

/** 0..1 progress toward the next rank. Returns 1 at max rank. */
export function progressToNextRank(power: number): number {
  const i = rankIndex(rankFor(power).id);
  const next = RANKS[i + 1];
  if (!next) return 1;
  const floorMin = RANKS[i].min;
  return clamp((power - floorMin) / (next.min - floorMin), 0, 1);
}

/* ------------------------- effort XP and levels ---------------------- */

/**
 * Effort XP for finishing a day's quest.
 * Streak bonus caps at 7 days so a 200-day streak can't dwarf a newcomer's
 * effort — and so missing one day is a setback, never a catastrophe.
 */
export function effortXpFor(kind: QuestKind, streak: number): number {
  const base = kind === "recovery" ? 30 : 50;
  const bonus = 5 * Math.min(Math.max(streak, 0), 7);
  return base + bonus;
}

/** Cosmetic level from effort XP. Level 1 at 0 XP, then a widening curve. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (l - 1) * (l - 1) * 100;
}

/** 0..1 progress across the current level. */
export function xpProgress(xp: number): number {
  const lvl = levelFromXp(xp);
  const start = xpForLevel(lvl);
  const end = xpForLevel(lvl + 1);
  if (end === start) return 0;
  return clamp((xp - start) / (end - start), 0, 1);
}

/* ------------------------------- dates ------------------------------ */

/** Local-date ISO string, YYYY-MM-DD. Local, so "today" means the user's today. */
export function toIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from `a` to `b`. Parsed at UTC noon so DST can't off-by-one us. */
export function daysBetween(a: string, b: string): number {
  const pa = parseIsoDate(a);
  const pb = parseIsoDate(b);
  if (pa === null || pb === null) return 0;
  return Math.round((pb - pa) / 86_400_000);
}

function parseIsoDate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const t = parseIsoDate(iso);
  if (t === null) return iso;
  const d = new Date(t + days * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/* ------------------------------ streaks ----------------------------- */

export interface StreakResult {
  streak: number;
  /** false when the quest for `today` was already logged. */
  changed: boolean;
}

/**
 * Streak rules:
 *   trained yesterday  -> +1
 *   already done today -> unchanged (this is what blocks XP farming)
 *   gap of 2+ days     -> back to 1, not 0. You showed up today; that counts.
 */
export function nextStreak(lastQuestDate: string | null, currentStreak: number, today: string): StreakResult {
  if (!lastQuestDate) return { streak: 1, changed: true };
  const gap = daysBetween(lastQuestDate, today);
  if (gap <= 0) return { streak: currentStreak, changed: false };
  if (gap === 1) return { streak: currentStreak + 1, changed: true };
  return { streak: 1, changed: true };
}

/* ------------------------------- quests ----------------------------- */

/**
 * Builds today's quest from the last *measured* maxes.
 * Working sets are a fraction of your true max and ramp ~5%/week, capped at
 * +50%. Deliberately gentle: the viral "100 reps every day" routines break
 * beginners and program no rest at all.
 */
export function buildQuest(
  m: Measures,
  dayIndex: number,
  tuning: Tuning = DEFAULT_TUNING
): Quest {
  const isRecovery =
    tuning.recoveryEveryNthDay > 0 &&
    dayIndex > 0 &&
    (dayIndex + 1) % tuning.recoveryEveryNthDay === 0;

  if (isRecovery) {
    return {
      kind: "recovery",
      sets: 0,
      pushupReps: 0,
      squatReps: 0,
      plankSeconds: 0,
      walkMinutes: 15,
      mobilityMinutes: 8,
    };
  }

  const week = Math.floor(Math.max(0, dayIndex) / 7);
  const ramp = 1 + Math.min(0.5, 0.05 * week);
  const f = tuning.workingSetFraction;

  return {
    kind: "training",
    sets: 3,
    pushupReps: Math.max(3, Math.round(m.pushups * f * ramp)),
    squatReps: Math.max(5, Math.round(m.squats * f * ramp)),
    plankSeconds: Math.max(15, Math.round(m.plankSeconds * 0.5 * ramp)),
    walkMinutes: 10 + Math.min(10, week * 2),
    mobilityMinutes: 0,
  };
}

/* -------------------------------- trials ---------------------------- */

export function isTrialDue(
  lastTrialDate: string | null,
  today: string,
  tuning: Tuning = DEFAULT_TUNING
): boolean {
  if (!lastTrialDate) return true;
  return daysBetween(lastTrialDate, today) >= tuning.trialIntervalDays;
}

export function daysUntilTrial(
  lastTrialDate: string | null,
  today: string,
  tuning: Tuning = DEFAULT_TUNING
): number {
  if (!lastTrialDate) return 0;
  return Math.max(0, tuning.trialIntervalDays - daysBetween(lastTrialDate, today));
}

/**
 * Consistency (0..1) = days trained / days elapsed since the last Trial.
 * Feeds Willpower. Capped at 1 so extra sessions can't inflate it.
 */
export function consistencyFrom(questsCompleted: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return clamp(questsCompleted / daysElapsed, 0, 1);
}

/** Per-measure change between two trials, for the "what actually improved" readout. */
export function measureDeltas(prev: Measures | null, next: Measures): Measures {
  if (!prev) return { pushups: 0, squats: 0, plankSeconds: 0, cardioSeconds: 0 };
  return {
    pushups: next.pushups - prev.pushups,
    squats: next.squats - prev.squats,
    plankSeconds: next.plankSeconds - prev.plankSeconds,
    cardioSeconds: next.cardioSeconds - prev.cardioSeconds,
  };
}

/* -------------------------------- utils ----------------------------- */

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** mm:ss for plank / run readouts. */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
