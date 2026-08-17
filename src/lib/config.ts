// =====================================================================
//  ⚙️  THE ONLY FILE YOU HAVE TO EDIT BEFORE GOING LIVE
// =====================================================================
//  Everything with an  ← EDIT  marker is a blank waiting for you.
//  Leave any of them empty and the app still runs: empty slots render as
//  clearly-marked placeholders instead of breaking or showing dead links.
// =====================================================================

/* ------------------------------------------------------------------ */
/*  1. YOUR BRAND                                                      */
/* ------------------------------------------------------------------ */
export const BRAND = {
  /** Your product name, shown in the header and on the landing page. */
  name: "ASCEND", // ← EDIT  e.g. "RANKUP"

  /** One line under the name. Say what it does, not how great it is. */
  tagline: "Your rank rises only when you actually do.", // ← EDIT

  /** The in-world name of the game layer. Keep it yours — do not use
   *  names or characters owned by Marvel, Shueisha, Toei, etc. */
  systemName: "THE SYSTEM",

  /** Optional. Leave "" to hide. */
  supportEmail: "", // ← EDIT  e.g. "you@yourdomain.com"
};

/* ------------------------------------------------------------------ */
/*  2. YOUR STARTUP  — the reserved space you asked for.               */
/*     Fill this in when you're ready. While every field is empty, the  */
/*     landing page shows a tidy "reserved" panel instead.              */
/* ------------------------------------------------------------------ */
export const STARTUP = {
  /** Legal / trading name of your company. */
  legalName: "", // ← EDIT  e.g. "Ascend Labs Pvt Ltd"

  /** Short "who's behind this" paragraph for the landing page. */
  about: "", // ← EDIT

  /** Where you are, for trust signals. */
  location: "", // ← EDIT  e.g. "Pune, India"

  /** Your marketing site, if you build one separately. Leave "" to hide. */
  website: "", // ← EDIT

  /** Social handles. Leave "" to hide each one individually. */
  socials: {
    x: "", // ← EDIT  e.g. "https://x.com/yourhandle"
    instagram: "", // ← EDIT
    youtube: "", // ← EDIT
    discord: "", // ← EDIT  your community invite — this is your retention moat
  },
};

/* ------------------------------------------------------------------ */
/*  3. UPI PAYMENTS  — vacant, as requested.                           */
/*     Put your UPI ID in and the Support page starts working: the      */
/*     button opens GPay / PhonePe / Paytm with the amount pre-filled.  */
/*                                                                     */
/*     Honest note: a UPI deep link is a *manual* payment, not a        */
/*     subscription. It's perfect for validating that people will pay   */
/*     at all (₹0 setup, no gateway account, you keep ~100%). When you  */
/*     want real recurring billing, move to Razorpay — see README.      */
/* ------------------------------------------------------------------ */
export const UPI = {
  /** Your UPI / VPA address. THIS IS THE ONE THAT MATTERS. */
  id: "", // ← EDIT  e.g. "yourname@oksbi"

  /** The name payers will see in their UPI app. */
  payeeName: "", // ← EDIT  e.g. "Ascend Labs"

  /** Amounts (₹) offered as buttons on the Support page. */
  tiers: [
    { amount: 99, label: "Supporter", perk: "Keeps the servers on" },
    { amount: 249, label: "Founding Hunter", perk: "Name in credits + early features" },
    { amount: 999, label: "Patron", perk: "Direct line to the roadmap" },
  ],

  /** Note attached to the payment so you can identify it later. */
  note: "Ascend support",

  /** Optional: drop a QR screenshot at  public/upi-qr.png  and it will
   *  appear automatically on the Support page. No code change needed.
   *  If the file isn't there, the image quietly hides itself. */
  qrImage: "/upi-qr.png",
};

/* ------------------------------------------------------------------ */
/*  4. GAME TUNING — safe to leave alone. Change once you have users.   */
/* ------------------------------------------------------------------ */
export const TUNING = {
  /** Days between Trials. 14 is deliberate: long enough for real
   *  physical adaptation, short enough that motivation doesn't rot. */
  trialIntervalDays: 14,

  /** Every Nth day is a Recovery quest. Rest is programmed, not a
   *  failure — this is the flaw in the viral "100 reps daily" routines. */
  recoveryEveryNthDay: 4,

  /** Working sets are this fraction of your last *measured* max.
   *  Starting small is not being soft: people who begin with minimal
   *  habits are far likelier to still be training months later. */
  workingSetFraction: 0.4,
};

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

/** True when you've filled in your UPI ID. */
export function isUpiConfigured(): boolean {
  return UPI.id.trim().length > 0 && UPI.id.includes("@");
}

/** True when any STARTUP field has been filled in. */
export function isStartupConfigured(): boolean {
  return Boolean(
    STARTUP.legalName.trim() ||
      STARTUP.about.trim() ||
      STARTUP.location.trim() ||
      STARTUP.website.trim()
  );
}

/**
 * Builds a standards-compliant UPI deep link.
 * Format:  upi://pay?pa=<vpa>&pn=<payee>&am=<amount>&cu=INR&tn=<note>
 * Returns "" if UPI isn't configured yet, so the UI can stay honest
 * instead of rendering a button that goes nowhere.
 */
export function buildUpiLink(amount: number): string {
  if (!isUpiConfigured()) return "";
  const params = new URLSearchParams({
    pa: UPI.id.trim(),
    pn: (UPI.payeeName || BRAND.name).trim(),
    am: String(amount),
    cu: "INR",
    tn: UPI.note,
  });
  return `upi://pay?${params.toString()}`;
}
