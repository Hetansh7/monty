# ASCEND — a real-world RPG where your stats are your body

A Next.js web app. Runs in any browser, deploys free on Vercel, uses Supabase for auth and data.
It also installs to a phone home screen (PWA), so you get an "app" without paying Google or Apple.

**The one rule that makes this different from every habit tracker:**

| Effort XP | Stats |
| --- | --- |
| Earned for showing up. Generous, forgiving. | Locked between trials. |
| Builds your streak and level. | Move **only** when a re-test measures real improvement. |
| Cannot raise a stat. Ever. | Cannot be grinded, bought, or faked. |

If you ever "fix" that by letting daily quests bump stats, you've built a habit tracker with extra
steps and thrown away the only thing you own.

---

## 1. What you must edit — one file

`src/lib/config.ts`. Nothing else. Every blank is marked `← EDIT`.

- `BRAND` — product name, tagline, support email
- `STARTUP` — **your startup's reserved slot**: legal name, about paragraph, city, website, socials
- `UPI` — **your vacant UPI ID**, payee name, three payment tiers
- `TUNING` — trial interval, rest-day cadence, working-set fraction (leave alone at first)

Leave anything empty and the app still works. Empty slots render as clearly-marked "reserved"
panels — never a dead link or a crash. Fill a field in, redeploy, and it appears.

Optional: drop a UPI QR screenshot at `public/upi-qr.png` and it shows up on `/support`
automatically. If the file isn't there, the image hides itself.

---

## 2. Supabase (5 minutes)

1. Create a free project at supabase.com. Pick the region closest to your users (Mumbai/Singapore
   for India).
2. Open **SQL Editor**, paste the whole of `supabase/schema.sql`, run it. Safe to re-run any time.
   It creates four tables, turns on Row Level Security with per-user policies, and installs a trigger
   that gives every new signup a profile and a stats row.
3. **Authentication → Providers → Email**: leave email/password on. While testing, turn **"Confirm
   email" off** so you don't have to click a link for every test account. Turn it back on before you
   share the app with anyone.
4. **Settings → API**: copy the Project URL and the `anon` public key.

Copy `.env.local.example` to `.env.local` and fill both in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Both are meant to be public — they ship in the browser bundle by design. **RLS is the actual
lock**, which is why `schema.sql` is not optional. Never put the `service_role` key in this app.

---

## 3. Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run typecheck` type-checks without building. `npm run build` produces the production build.

Note: this project was written in a sandbox with no npm registry access, so `npm install` and
`next build` have never been executed. Dependency versions are pinned exactly and the game logic is
verified independently (below), but the very first `npm run build` on your machine is the real
smoke test. Do it before you deploy, not after.

Verify the rules engine with no test framework and no installs (needs Node 22.18+):

```bash
node verify/game.test.mjs     # 93 assertions
```

That suite includes the integrity test that matters: it simulates 90 days of quest completions,
confirms XP and level climb, and asserts strength, power and rank did **not** move.

---

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. vercel.com → **Add New → Project** → import the repo. Framework auto-detects as Next.js; accept
   every default.
3. Add the two environment variables from step 2 (**Settings → Environment Variables**), for
   Production *and* Preview.
4. Deploy. Free tier is plenty for your first few thousand users.

Whenever you change env vars you must **redeploy** — `NEXT_PUBLIC_*` values are baked in at build
time, not read at runtime.

Then in Supabase, **Authentication → URL Configuration**, set your Vercel URL as the Site URL so
confirmation emails point at the live app instead of localhost.

---

## 5. Money, honestly

The UPI link is a deep link: it opens GPay/PhonePe/Paytm with the amount pre-filled. Costs ₹0, needs
no gateway account, no KYC beyond the UPI ID you already have, and you keep effectively all of it.

It is **not a subscription**. Nobody is charged again next month, and the app cannot tell who paid.
Use it to answer one question cheaply: *will anyone pay at all?* If the answer is yes, move to
**Razorpay** (Indian, supports UPI AutoPay/eMandate recurring, ~2% + GST) and add a `subscriptions`
table plus a webhook route. Don't build that until money has actually arrived — it's a week of work
guarding an assumption you haven't tested.

Never gate stats behind payment. Cosmetics, extra paths, longer history, coaching: fine.

---

## 6. Structure

```
src/lib/config.ts        ← the only file you edit
src/lib/game.ts          pure rules: stats, ranks, XP, streaks, quests. No imports.
src/lib/db.ts            every Supabase read/write. recordTrial() is the only door to stats.
src/lib/useHunter.ts     one hook that loads the player's world and derives the rest
src/lib/mentors.ts       6 public-domain historical archetypes + templated narrator
src/app/page.tsx         landing + sign in / sign up
src/app/awakening/       one-time baseline test
src/app/dashboard/       today's quest, status, streak
src/app/trial/           the 14-day re-test — the only place stats change
src/app/mentors/         pick a path
src/app/support/         UPI page (reads your config)
src/app/manifest.ts      PWA manifest, generated from BRAND — rename once, renames everywhere
supabase/schema.sql      tables, RLS, signup trigger
verify/game.test.mjs     93 assertions, run with plain node
public/DELETE-ME.txt     housekeeping note; delete it
```

`trials` is append-only on purpose: select and insert policies only, no update. Your rank has to be
provable or it means nothing. `quest_log` has `unique (user_id, quest_date)` — that constraint is
what stops XP farming, not the UI.

`npm run lint` is wired but ESLint isn't installed; the first run offers to set it up. Optional —
the build doesn't need it.

---

## 7. Legal

Every mentor is a documented historical figure long in the public domain, described in our own
words, with quotes only where they're genuinely public domain and sourced. There is nothing from
Marvel, Shueisha, Toei, Crunchyroll or any other rights holder — no names, no art, no logos, no
"System" iconography lifted from a series. Keep it that way as you add mentors: original
illustrated art only, never photographs of real people.

Before you take payments in India as a business, look into your GST position and add a privacy
policy — you're storing emails and health-adjacent fitness measurements, which the DPDP Act 2023
treats as personal data. Not legal advice; talk to someone qualified once real money moves.
