"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabaseClient";
import { TUNING } from "./config";
import {
  buildQuest,
  daysBetween,
  daysUntilTrial,
  isTrialDue,
  levelFromXp,
  rankFor,
  toIsoDate,
  xpProgress,
  type Measures,
  type Quest,
} from "./game";
import {
  ensureRows,
  fetchProfile,
  fetchRecentQuests,
  fetchStats,
  fetchTrials,
  type ProfileRow,
  type QuestRow,
  type StatsRow,
  type TrialRow,
} from "./db";

export interface HunterState {
  loading: boolean;
  error: string | null;
  session: Session | null;
  profile: ProfileRow | null;
  stats: StatsRow | null;
  trials: TrialRow[];
  quests: QuestRow[];

  /* derived */
  awakened: boolean;
  baselineDate: string | null;
  lastTrialDate: string | null;
  dayIndex: number;
  todayQuest: Quest | null;
  questDoneToday: boolean;
  trialDue: boolean;
  daysToTrial: number;
  level: number;
  levelProgress: number;
  rankTitle: string;
  latestMeasures: Measures | null;

  refresh: () => Promise<void>;
}

/**
 * Single source of truth for the logged-in player's world.
 * Loads everything once, derives the rest locally, and hands back a
 * refresh() to call after any write.
 */
export function useHunter(): HunterState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<StatsRow | null>(null);
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);

  const loadFor = useCallback(async (userId: string) => {
    try {
      await ensureRows(userId);
      const [p, s, t, q] = await Promise.all([
        fetchProfile(userId),
        fetchStats(userId),
        fetchTrials(userId, 24),
        fetchRecentQuests(userId, 60),
      ]);
      setProfile(p);
      setStats(s);
      setTrials(t);
      setQuests(q);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your data.");
    }
  }, []);

  /* auth bootstrap + subscription */
  useEffect(() => {
    const c = getSupabase();
    if (!c) {
      setError("Supabase isn't configured yet.");
      setLoading(false);
      return;
    }

    let active = true;

    c.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
        if (data.session?.user) await loadFor(data.session.user.id);
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Could not reach Supabase. Check your project URL.");
          setLoading(false);
        }
      });

    const { data: sub } = c.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next ?? null);
      if (next?.user) {
        void loadFor(next.user.id);
      } else {
        setProfile(null);
        setStats(null);
        setTrials([]);
        setQuests([]);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFor]);

  const refresh = useCallback(async () => {
    if (session?.user) await loadFor(session.user.id);
  }, [session, loadFor]);

  /* ------------------------------ derived --------------------------- */
  const derived = useMemo(() => {
    const today = toIsoDate();

    const baseline = trials.find((t) => t.is_baseline) ?? trials[trials.length - 1] ?? null;
    const baselineDate = baseline ? toIsoDate(new Date(baseline.taken_at)) : null;

    const latest = trials[0] ?? null;
    const lastTrialDate = latest ? toIsoDate(new Date(latest.taken_at)) : null;

    const latestMeasures: Measures | null = latest
      ? {
          pushups: latest.pushups,
          squats: latest.squats,
          plankSeconds: latest.plank_seconds,
          cardioSeconds: latest.cardio_seconds,
        }
      : null;

    const dayIndex = baselineDate ? Math.max(0, daysBetween(baselineDate, today)) : 0;
    const todayQuest = latestMeasures ? buildQuest(latestMeasures, dayIndex, TUNING) : null;
    const questDoneToday = quests.some((q) => q.quest_date === today);

    const xp = profile?.effort_xp ?? 0;

    return {
      awakened: Boolean(profile?.awakened && latest),
      baselineDate,
      lastTrialDate,
      dayIndex,
      todayQuest,
      questDoneToday,
      trialDue: Boolean(latest) && isTrialDue(lastTrialDate, today, TUNING),
      daysToTrial: daysUntilTrial(lastTrialDate, today, TUNING),
      level: levelFromXp(xp),
      levelProgress: xpProgress(xp),
      rankTitle: rankFor(stats?.power ?? 0).title,
      latestMeasures,
    };
  }, [trials, quests, profile, stats]);

  return {
    loading,
    error,
    session,
    profile,
    stats,
    trials,
    quests,
    refresh,
    ...derived,
  };
}
