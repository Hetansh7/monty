// =====================================================================
//  MENTORS — the archetype the player embodies.
//
//  LEGAL NOTE, because this is the thing that can get an app deleted:
//  every figure here is long dead and firmly in the public domain, and
//  every description below is written from documented historical record
//  in our own words. There are NO quotes attributed that they didn't
//  write, no photographs, and nothing owned by Marvel, Shueisha, Toei,
//  Crunchyroll or any other rights holder. Keep it that way. If you add
//  a mentor, use original illustrated art only — never a photo, never a
//  character someone else owns.
// =====================================================================

export interface Mentor {
  id: string;
  /** The archetype the *player* becomes. The mentor is the path, not an idol. */
  archetype: string;
  historicalName: string;
  era: string;
  /** Which stat this path emphasises. */
  focus: "strength" | "core" | "stamina" | "willpower" | "balanced";
  /** Why this person, in plain language. Documented record, our words. */
  story: string;
  /** How the path shows up in the app mechanically. */
  mechanic: string;
  /** A public-domain line, or "" for none. Never invent one. */
  publicDomainLine: string;
  lineSource: string;
  glyph: string;
}

export const MENTORS: Mentor[] = [
  {
    id: "milo",
    archetype: "The Beast",
    historicalName: "Milo of Croton",
    era: "6th century BCE",
    focus: "strength",
    story:
      "A wrestler from the Greek colony of Croton who dominated the ancient games for decades. The story told about him for 2,500 years is that he lifted a newborn calf and kept lifting it every single day as it grew into a full bull. Historians treat the calf as legend, but the principle underneath it is the most important idea in all of training: add a little more than yesterday, forever.",
    mechanic:
      "Progressive overload. Your working sets are a fixed share of your last measured max, so the moment you get stronger the quests get heavier — automatically.",
    publicDomainLine: "",
    lineSource: "",
    glyph: "◆",
  },
  {
    id: "aurelius",
    archetype: "The Stoic",
    historicalName: "Marcus Aurelius",
    era: "121–180 CE",
    focus: "willpower",
    story:
      "A Roman emperor who ran an empire through war and plague, and who wrote a private notebook to himself about getting out of bed and doing the work anyway. He never published it. It survived as Meditations, and it is essentially the oldest discipline journal we have.",
    mechanic:
      "The Hard Set. One block of each quest is marked uncomfortable on purpose. Finishing on days you don't feel like it is what raises Willpower.",
    publicDomainLine:
      "At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work — as a human being.",
    lineSource: "Meditations, Book V (public domain)",
    glyph: "◈",
  },
  {
    id: "epictetus",
    archetype: "The Unbreakable",
    historicalName: "Epictetus",
    era: "c. 50–135 CE",
    focus: "willpower",
    story:
      "Born into slavery in Roman Phrygia and permanently lame in one leg. After being freed he taught for the rest of his life that you control your response and almost nothing else. The whole underdog arc, two thousand years before anyone drew it as a comic.",
    mechanic:
      "Recovery from a break. Miss days and your streak restarts at one, never zero — and the app asks what got in the way instead of shaming you.",
    publicDomainLine: "It is not what happens to you, but how you react to it that matters.",
    lineSource: "attributed, Discourses tradition (public domain)",
    glyph: "◇",
  },
  {
    id: "musashi",
    archetype: "The Master",
    historicalName: "Miyamoto Musashi",
    era: "1584–1645",
    focus: "core",
    story:
      "A Japanese swordsman who reportedly went undefeated across dozens of duels, then spent his last years in a cave writing down what he had learned. His obsession was single-skill depth: one technique, refined past the point most people would call finished.",
    mechanic:
      "Skill ladders. Instead of chasing more reps, you chase the next movement — knee push-up to full, full to one-arm, plank to lever.",
    publicDomainLine: "Do nothing that is of no use.",
    lineSource: "The Book of Five Rings (public domain)",
    glyph: "◉",
  },
  {
    id: "curie",
    archetype: "The Seeker",
    historicalName: "Marie Curie",
    era: "1867–1934",
    focus: "stamina",
    story:
      "Processed literal tonnes of ore by hand in a leaking shed to isolate a few grams of radium, then won Nobel Prizes in two different sciences. Her defining trait wasn't a flash of genius — it was refusing to stop over years of unglamorous, physically exhausting work.",
    mechanic:
      "The long grind. This path weights endurance and tracks one distant target for months, showing cumulative totals rather than daily wins.",
    publicDomainLine: "",
    lineSource: "",
    glyph: "◎",
  },
  {
    id: "davinci",
    archetype: "The Polymath",
    historicalName: "Leonardo da Vinci",
    era: "1452–1519",
    focus: "balanced",
    story:
      "Painter, anatomist, engineer, and a careful student of how the human body actually works — he dissected and drew it to understand it. He refused to be one thing, and his notebooks are a record of relentless curiosity applied in every direction at once.",
    mechanic:
      "Balanced ascent. This path levels every stat evenly and flags your weakest one, so you can't ignore what you're bad at.",
    publicDomainLine: "",
    lineSource: "",
    glyph: "◐",
  },
];

export function mentorById(id: string | null | undefined): Mentor | null {
  if (!id) return null;
  return MENTORS.find((m) => m.id === id) ?? null;
}

/**
 * The narrator voice for a completed quest. Templated, not AI-generated:
 * zero cost, zero latency, no API key, and it can never say something
 * embarrassing. Swap in an LLM later if you want — this is the safe default.
 */
export function questLine(mentorId: string | null, streak: number): string {
  const m = mentorById(mentorId);
  const generic = [
    "Logged. The number that matters is measured at the Trial.",
    "Done is done. Come back tomorrow.",
    "Effort recorded. Stats stay locked until you're tested.",
  ];
  if (!m) return generic[streak % generic.length];

  const byMentor: Record<string, string[]> = {
    milo: [
      "A little more than yesterday. That is the whole method.",
      "The calf grew. So did the load. Keep going.",
      "Strength is just yesterday, plus one.",
    ],
    aurelius: [
      "You did not feel like it. You did it. That is the entire point.",
      "The work was in front of you and you met it.",
      "Discipline is not a mood. Today proved it.",
    ],
    epictetus: [
      "The day was not in your control. This was.",
      "You showed up. Nothing else was required.",
      "Setbacks are terrain, not verdicts.",
    ],
    musashi: [
      "Refine, then refine again. Reps are not the goal — control is.",
      "Nothing wasted today.",
      "The movement is closer to clean than it was.",
    ],
    curie: [
      "Unglamorous work, done anyway. It compounds.",
      "Tonnes of ore for a few grams. Today was one shovelful.",
      "Persistence is the technique.",
    ],
    davinci: [
      "Balance held. Check your weakest stat before the Trial.",
      "Curiosity plus repetition. Both were present today.",
      "You trained the part you like least. Good.",
    ],
  };
  const lines = byMentor[m.id] ?? generic;
  return lines[Math.max(0, streak) % lines.length];
}
