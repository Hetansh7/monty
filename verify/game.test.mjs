// =====================================================================
//  Logic tests. No test framework, no install needed:
//      node verify/game.test.mjs
//  (Node 22.18+ runs TypeScript directly. On older Node use:
//      node --experimental-strip-types verify/game.test.mjs )
//
//  These guard the rules that make the app honest. If you ever change
//  the curves or the streak logic, run this first.
// =====================================================================

import {
  saturate,
  computeStats,
  rankFor,
  rankIndex,
  didRankUp,
  progressToNextRank,
  effortXpFor,
  levelFromXp,
  xpForLevel,
  xpProgress,
  toIsoDate,
  daysBetween,
  addDays,
  nextStreak,
  buildQuest,
  isTrialDue,
  daysUntilTrial,
  consistencyFrom,
  measureDeltas,
  formatSeconds,
  RANKS,
  DEFAULT_TUNING,
} from "../src/lib/game.ts";

let passed = 0;
let failed = 0;

function ok(name, cond, extra = "") {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra ? "  -> " + extra : ""}`);
  }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}
function section(t) {
  console.log(`\n${t}`);
}

/* ------------------------------ curves ------------------------------ */
section("stat curves");
eq("zero reps => zero", saturate(0, 40), 0);
ok("saturate never reaches 100", saturate(1e9, 40) < 100);
ok("saturate is monotonic", saturate(10, 40) < saturate(11, 40));
ok("40 pushups sits near mid-scale", Math.abs(saturate(40, 40) - 50) < 0.001);
ok("beginner gains are visible (0->10 pushups moves >15pts)", saturate(10, 40) > 15);

section("computeStats");
const beginner = { pushups: 8, squats: 15, plankSeconds: 25, cardioSeconds: 120 };
const later = { pushups: 25, squats: 40, plankSeconds: 75, cardioSeconds: 420 };
const sB = computeStats(beginner, 0);
const sL = computeStats(later, 0.8);
ok("all stats are integers", Object.values(sL).every((v) => Number.isInteger(v)));
ok("beginner power is low", sB.power < 20, `power=${sB.power}`);
ok("improvement raises strength", sL.strength > sB.strength);
ok("improvement raises power", sL.power > sB.power);
eq("willpower is purely consistency (0 => 0)", sB.willpower, 0);
eq("willpower 0.8 => 80", sL.willpower, 80);
eq("consistency cannot exceed 100", computeStats(later, 5).willpower, 100);
eq("negative consistency floors at 0", computeStats(later, -3).willpower, 0);
ok(
  "a zero-effort perfect physique still can't max power",
  computeStats({ pushups: 999, squats: 999, plankSeconds: 999, cardioSeconds: 9999 }, 0).power < 100
);

/* ------------------------------- ranks ------------------------------ */
section("ranks");
eq("everyone starts at E", rankFor(0).id, "E");
eq("power 11 still E", rankFor(11).id, "E");
eq("power 12 => D", rankFor(12).id, "D");
eq("power 25 => C", rankFor(25).id, "C");
eq("power 40 => B", rankFor(40).id, "B");
eq("power 55 => A", rankFor(55).id, "A");
eq("power 70 => S", rankFor(70).id, "S");
eq("power 100 stays S", rankFor(100).id, "S");
ok("rank thresholds ascend", RANKS.every((r, i) => i === 0 || r.min > RANKS[i - 1].min));
ok("rank ids unique", new Set(RANKS.map((r) => r.id)).size === RANKS.length);
eq("rankIndex E", rankIndex("E"), 0);
ok("didRankUp true across boundary", didRankUp(11, 12));
ok("didRankUp false within band", !didRankUp(12, 24));
ok("didRankUp false when power drops", !didRankUp(30, 20));
eq("progress at band floor is 0", progressToNextRank(12), 0);
eq("progress at max rank is 1", progressToNextRank(95), 1);
ok("progress mid-band is between", progressToNextRank(18) > 0 && progressToNextRank(18) < 1);

/* ---------------------------- effort XP ----------------------------- */
section("effort XP and levels");
eq("training base", effortXpFor("training", 0), 50);
eq("recovery is worth less but not nothing", effortXpFor("recovery", 0), 30);
eq("streak bonus caps at 7 days", effortXpFor("training", 500), effortXpFor("training", 7));
ok("streak bonus rewards early consistency", effortXpFor("training", 3) > effortXpFor("training", 0));
eq("level 1 at zero xp", levelFromXp(0), 1);
eq("level 2 at 100", levelFromXp(100), 2);
eq("level 3 at 400", levelFromXp(400), 3);
eq("xpForLevel roundtrip L5", levelFromXp(xpForLevel(5)), 5);
eq("xpForLevel roundtrip L12", levelFromXp(xpForLevel(12)), 12);
eq("progress is 0 at level start", xpProgress(xpForLevel(4)), 0);
ok("progress under 1 mid-level", xpProgress(xpForLevel(4) + 10) < 1);
ok("negative xp is safe", levelFromXp(-500) === 1);

/* ------------------------------ dates ------------------------------- */
section("dates");
eq("iso format", toIsoDate(new Date(2026, 7, 16)), "2026-08-16");
eq("same day", daysBetween("2026-08-16", "2026-08-16"), 0);
eq("one day", daysBetween("2026-08-16", "2026-08-17"), 1);
eq("across month", daysBetween("2026-08-31", "2026-09-01"), 1);
eq("across year", daysBetween("2025-12-31", "2026-01-01"), 1);
eq("leap day", daysBetween("2028-02-28", "2028-03-01"), 2);
eq("backwards is negative", daysBetween("2026-08-17", "2026-08-16"), -1);
eq("14 day window", daysBetween("2026-08-02", "2026-08-16"), 14);
eq("addDays forward", addDays("2026-08-31", 1), "2026-09-01");
eq("addDays back", addDays("2026-01-01", -1), "2025-12-31");
eq("malformed input is safe", daysBetween("nonsense", "2026-08-16"), 0);

/* ----------------------------- streaks ------------------------------ */
section("streaks");
eq("first ever quest starts at 1", nextStreak(null, 0, "2026-08-16").streak, 1);
eq("consecutive day increments", nextStreak("2026-08-15", 4, "2026-08-16").streak, 5);
ok("same day does not change", !nextStreak("2026-08-16", 5, "2026-08-16").changed);
eq("same day keeps count", nextStreak("2026-08-16", 5, "2026-08-16").streak, 5);
eq("2-day gap resets to 1, not 0", nextStreak("2026-08-13", 20, "2026-08-16").streak, 1);
ok("reset still counts as a change", nextStreak("2026-08-13", 20, "2026-08-16").changed);

/* ------------------------------ quests ------------------------------ */
section("quests");
const q0 = buildQuest(beginner, 0);
eq("day 0 is training", q0.kind, "training");
ok("floors protect true beginners", q0.pushupReps >= 3 && q0.squatReps >= 5 && q0.plankSeconds >= 15);
ok("day 0 is far easier than the measured max", q0.pushupReps < beginner.pushups);
const q3 = buildQuest(beginner, 3);
eq("every 4th day is recovery", q3.kind, "recovery");
ok("recovery programs no reps", q3.pushupReps === 0 && q3.sets === 0);
ok("recovery still asks for a walk", q3.walkMinutes > 0);
const strongEarly = buildQuest(later, 0);
const strongLater = buildQuest(later, 28);
ok("volume ramps over weeks", strongLater.pushupReps > strongEarly.pushupReps);
const capped = buildQuest(later, 365);
ok("ramp is capped at +50%", capped.pushupReps <= Math.round(later.pushups * 0.4 * 1.5));
ok("a year in, quests are still sane", capped.pushupReps < later.pushups);
ok("walk minutes capped", capped.walkMinutes <= 20);
const zeroUser = buildQuest({ pushups: 0, squats: 0, plankSeconds: 0, cardioSeconds: 0 }, 0);
ok("someone who can do nothing still gets a doable quest", zeroUser.pushupReps === 3 && zeroUser.squatReps === 5);

/* ------------------------------ trials ------------------------------ */
section("trials");
ok("no baseline => trial due", isTrialDue(null, "2026-08-16"));
ok("day 13 not due", !isTrialDue("2026-08-03", "2026-08-16"));
ok("day 14 due", isTrialDue("2026-08-02", "2026-08-16"));
eq("countdown", daysUntilTrial("2026-08-10", "2026-08-16"), 8);
eq("countdown floors at 0", daysUntilTrial("2026-07-01", "2026-08-16"), 0);
eq("interval matches tuning", DEFAULT_TUNING.trialIntervalDays, 14);
eq("perfect consistency", consistencyFrom(14, 14), 1);
eq("half consistency", consistencyFrom(7, 14), 0.5);
eq("cannot exceed 1", consistencyFrom(30, 14), 1);
eq("zero elapsed is safe", consistencyFrom(5, 0), 0);
eq("delta with no history is zero", measureDeltas(null, later).pushups, 0);
eq("delta computes gain", measureDeltas(beginner, later).pushups, 17);
eq("delta can be negative", measureDeltas(later, beginner).pushups, -17);

/* ----------------------- the integrity guarantee -------------------- */
section("integrity: effort can never move a stat");
// Simulate 90 days of logging quests. Effort XP and level climb; stats are
// untouched because nothing but a Trial is allowed to write them.
let xp = 0;
let streak = 0;
let last = null;
let day = "2026-08-16";
const statsBefore = computeStats(beginner, 0);
for (let i = 0; i < 90; i++) {
  const r = nextStreak(last, streak, day);
  streak = r.streak;
  const kind = buildQuest(beginner, i).kind;
  xp += effortXpFor(kind, streak);
  last = day;
  day = addDays(day, 1);
}
const statsAfter = computeStats(beginner, 0);
ok("90 days of effort raised XP", xp > 4000, `xp=${xp}`);
ok("90 days of effort raised level", levelFromXp(xp) > 6, `level=${levelFromXp(xp)}`);
eq("strength unchanged by effort alone", statsAfter.strength, statsBefore.strength);
eq("power unchanged by effort alone", statsAfter.power, statsBefore.power);
eq("rank unchanged by effort alone", rankFor(statsAfter.power).id, rankFor(statsBefore.power).id);
// Only a real improvement moves the rank.
const improved = computeStats({ pushups: 30, squats: 45, plankSeconds: 90, cardioSeconds: 600 }, 0.85);
ok("real measured improvement DOES move rank", rankIndex(rankFor(improved.power).id) > rankIndex(rankFor(statsBefore.power).id));

section("formatting");
eq("mm:ss", formatSeconds(75), "1:15");
eq("pads seconds", formatSeconds(65), "1:05");
eq("zero", formatSeconds(0), "0:00");

/* ------------------------------- report ----------------------------- */
console.log(`\n${"=".repeat(46)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(46)}\n`);
process.exit(failed === 0 ? 0 : 1);
