"use client";

import { getSupabase } from "./supabaseClient";
import {
  computeStats,
  consistencyFrom,
  daysBetween,
  effortXpFor,
  nextStreak,
  rankFor,
  toIsoDate,
  type Measures,
  type QuestKind,
  type Stats,
} from "./game";

/* ------------------------------- row types -------------------------- */

export interface ProfileRow {
  id: string;
  hunter_name: string | null;
  mentor_id: string | null;
  rank: string;
  effort_xp: number;
  streak: number;
  best_streak: number;
  last_quest_date: string | null;
  awakened: boolean;
}

export interface StatsRow {
  user_id: string;
  strength: number;
  core: number;
  stamina: number;
  willpower: number;
  power: number;
  updated_at: string;
}

export interface TrialRow {
  id: number;
  user_id: string;
  taken_at: string;
  is_baseline: boolean;
  pushups: number;
  squats: number;
  plank_seconds: number;
  cardio_seconds: number;
  strength: number;
  core: number;
  stamina: number;
  willpower: number;
  power: number;
  rank: string;
}

export interface QuestRow {
  id: number;
  quest_date: string;
  kind: QuestKind;
  effort_xp: number;
  pushups: number;
  squats: number;
  plank_seconds: number;
  walk_minutes: number;
}

/** Thrown with a message you can actually show a user. */
export class DbError extends Error {}

function sb() {
  const c = getSupabase();
  if (!c) throw new DbError("Supabase isn't configured. Add your two env vars and reload.");
  return c;
}

/* ------------------------------ self-heal --------------------------- */

/**
 * Makes sure this user has a profile and a stats row.
 * The SQL trigger normally does this at signup; this is the belt-and-braces
 * path so a missing trigger can never leave someone stuck on a blank screen.
 */
export async function ensureRows(userId: string): Promise<void> {
  const c = sb();
  const p = await c.from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (p.error && p.error.code !== "23505") throw new DbError(p.error.message);

  const s = await c.from("stats").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (s.error && s.error.code !== "23505") throw new DbError(s.error.message);
}

/* -------------------------------- reads ----------------------------- */

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await sb().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new DbError(error.message);
  return (data as ProfileRow) ?? null;
}

export async function fetchStats(userId: string): Promise<StatsRow | null> {
  const { data, error } = await sb().from("stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new DbError(error.message);
  return (data as StatsRow) ?? null;
}

export async function fetchTrials(userId: string, limit = 24): Promise<TrialRow[]> {
  const { data, error } = await sb()
    .from("trials")
    .select("*")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(limit);
  if (error) throw new DbError(error.message);
  return (data as TrialRow[]) ?? [];
}

export async function fetchRecentQuests(userId: string, limit = 60): Promise<QuestRow[]> {
  const { data, error } = await sb()
    .from("quest_log")
    .select("id, quest_date, kind, effort_xp, pushups, squats, plank_seconds, walk_minutes")
    .eq("user_id", userId)
    .order("quest_date", { ascending: false })
    .limit(limit);
  if (error) throw new DbError(error.message);
  return (data as QuestRow[]) ?? [];
}

/* ------------------------------- writes ----------------------------- */

export async function setMentor(userId: string, mentorId: string): Promise<void> {
  const { error } = await sb().from("profiles").update({ mentor_id: mentorId, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) throw new DbError(error.message);
}

export async function setHunterName(userId: string, name: string): Promise<void> {
  const { error } = await sb()
    .from("profiles")
    .update({ hunter_name: name.slice(0, 40), updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new DbError(error.message);
}

export interface CompleteQuestInput {
  userId: string;
  kind: QuestKind;
  pushups: number;
  squats: number;
  plankSeconds: number;
  walkMinutes: number;
}

export interface CompleteQuestResult {
  alreadyDone: boolean;
  effortXp: number;
  streak: number;
}

/**
 * Logs today's quest and awards Effort XP.
 *
 * Note what this function does NOT do: touch the stats table. That
 * separation is the product. Effort buys you the streak and the level;
 * only a Trial can move a stat.
 */
export async function completeQuest(input: CompleteQuestInput): Promise<CompleteQuestResult> {
  const c = sb();
  const today = toIsoDate();

  const profile = await fetchProfile(input.userId);
  if (!profile) throw new DbError("Profile missing. Reload the page.");

  const step = nextStreak(profile.last_quest_date, profile.streak, today);
  if (!step.changed) {
    return { alreadyDone: true, effortXp: 0, streak: profile.streak };
  }

  const gained = effortXpFor(input.kind, step.streak);

  const insert = await c.from("quest_log").insert({
    user_id: input.userId,
    quest_date: today,
    kind: input.kind,
    pushups: input.pushups,
    squats: input.squats,
    plank_seconds: input.plankSeconds,
    walk_minutes: input.walkMinutes,
    effort_xp: gained,
  });

  // 23505 = unique violation: the day was already logged (e.g. two tabs open).
  if (insert.error) {
    if (insert.error.code === "23505") {
      return { alreadyDone: true, effortXp: 0, streak: profile.streak };
    }
    throw new DbError(insert.error.message);
  }

  const upd = await c
    .from("profiles")
    .update({
      effort_xp: profile.effort_xp + gained,
      streak: step.streak,
      best_streak: Math.max(profile.best_streak, step.streak),
      last_quest_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId);
  if (upd.error) throw new DbError(upd.error.message);

  return { alreadyDone: false, effortXp: gained, streak: step.streak };
}

export interface RecordTrialInput {
  userId: string;
  measures: Measures;
  isBaseline: boolean;
}

export interface RecordTrialResult {
  stats: Stats;
  rank: string;
  previousPower: number;
}

/**
 * The only door through which stats can change.
 *
 * Willpower is derived here from measured consistency (quests logged /
 * days elapsed since the last Trial), so it cannot be self-reported either.
 */
export async function recordTrial(input: RecordTrialInput): Promise<RecordTrialResult> {
  const c = sb();
  const today = toIsoDate();

  const [profile, prevStats, trials, quests] = await Promise.all([
    fetchProfile(input.userId),
    fetchStats(input.userId),
    fetchTrials(input.userId, 1),
    fetchRecentQuests(input.userId, 200),
  ]);
  if (!profile) throw new DbError("Profile missing. Reload the page.");

  const lastTrial = trials[0] ?? null;
  const lastTrialDate = lastTrial ? toIsoDate(new Date(lastTrial.taken_at)) : null;

  // Consistency window: since the last trial, or 0 for the baseline.
  let consistency = 0;
  if (lastTrialDate) {
    const elapsed = Math.max(1, daysBetween(lastTrialDate, today));
    const done = quests.filter((q) => q.quest_date > lastTrialDate && q.quest_date <= today).length;
    consistency = consistencyFrom(done, elapsed);
  }

  const stats = computeStats(input.measures, consistency);
  const rank = rankFor(stats.power);
  const previousPower = prevStats?.power ?? 0;

  const ins = await c.from("trials").insert({
    user_id: input.userId,
    is_baseline: input.isBaseline,
    pushups: input.measures.pushups,
    squats: input.measures.squats,
    plank_seconds: input.measures.plankSeconds,
    cardio_seconds: input.measures.cardioSeconds,
    strength: stats.strength,
    core: stats.core,
    stamina: stats.stamina,
    willpower: stats.willpower,
    power: stats.power,
    rank: rank.id,
  });
  if (ins.error) throw new DbError(ins.error.message);

  const su = await c
    .from("stats")
    .update({
      strength: stats.strength,
      core: stats.core,
      stamina: stats.stamina,
      willpower: stats.willpower,
      power: stats.power,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);
  if (su.error) throw new DbError(su.error.message);

  const pu = await c
    .from("profiles")
    .update({ rank: rank.id, awakened: true, updated_at: new Date().toISOString() })
    .eq("id", input.userId);
  if (pu.error) throw new DbError(pu.error.message);

  return { stats, rank: rank.id, previousPower };
}
