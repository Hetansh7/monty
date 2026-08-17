"use client";

import { useState } from "react";
import Link from "next/link";
import SystemWindow from "@/components/SystemWindow";
import StartupSlot from "@/components/StartupSlot";
import { BRAND, STARTUP, UPI, buildUpiLink, isUpiConfigured } from "@/lib/config";

export default function SupportPage() {
  const configured = isUpiConfigured();
  const [copied, setCopied] = useState(false);
  const [qrOk, setQrOk] = useState(true);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(UPI.id.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const socials = Object.entries(STARTUP.socials).filter(([, url]) => url.trim().length > 0);

  return (
    <div className="wrap page-pad stack-lg">
      {/* ------------------------------ pitch ----------------------------- */}
      <SystemWindow label="support" variant="glow">
        <h1>Keep {BRAND.name} free for the person at Rank E.</h1>
        <p className="lead">
          There is no paywall, no ads, and nothing here that can be bought — paying cannot raise a
          single stat, and it never will. That is the one rule the whole app is built on. If it is
          useful to you, this is the only way to say so.
        </p>
        <p className="sys-faint" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          Supporting is optional and always will be. Skipping it changes nothing about your account.
        </p>
      </SystemWindow>

      {/* ------------------------------ UPI ------------------------------- */}
      {configured ? (
        <SystemWindow label="pay by UPI" variant="glow">
          <p className="sys-dim" style={{ fontSize: "0.92rem" }}>
            Tap a tier and your UPI app opens with the amount already filled in. Works with GPay,
            PhonePe, Paytm, BHIM and any bank app.
          </p>

          {/* No target="_blank": upi:// is handed to the phone's payment app,
              not opened as a web page. */}
          <div className="stack" style={{ margin: "1.25rem 0" }}>
            {UPI.tiers.map((t) => (
              <a key={t.amount} className="tier" href={buildUpiLink(t.amount)}>
                <span>
                  <span className="tier-label">{t.label}</span>
                  <span className="tier-perk">{t.perk}</span>
                </span>
                <span className="tier-amount mono">₹{t.amount}</span>
              </a>
            ))}
          </div>

          <div className="row-between" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div className="sys-label">or send to</div>
              <div className="mono" style={{ fontSize: "1rem" }}>
                {UPI.id}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyId}>
              {copied ? "copied ✓" : "Copy UPI ID"}
            </button>
          </div>

          {UPI.qrImage && qrOk && (
            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              {/* plain <img> on purpose: next/image would need config for this
                  to work, and a missing file should fail silently, not loudly */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={UPI.qrImage}
                alt={`UPI QR code for ${UPI.payeeName || BRAND.name}`}
                className="qr"
                onError={() => setQrOk(false)}
              />
              <div className="sys-faint mono" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                scan with any UPI app
              </div>
            </div>
          )}

          <hr className="divider" />
          <p className="sys-faint" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
            A UPI transfer is a one-off payment, not a subscription — nothing recurring is set up and
            nothing is stored on our side. On desktop the link only works if a UPI app is installed;
            otherwise use the QR or the ID above from your phone.
          </p>
        </SystemWindow>
      ) : (
        /* -------- the vacant slot, before you fill config.ts in --------- */
        <SystemWindow label="payments · not configured" variant="quiet">
          <div className="slot">
            <div className="slot-tag mono">reserved · your UPI ID</div>
            <p className="sys-dim" style={{ fontSize: "0.92rem", marginBottom: "0.9rem" }}>
              This page is wired and ready. It stays in this honest &ldquo;not set up yet&rdquo; state
              until you add your own UPI ID — no dead buttons, nothing for a user to tap that goes
              nowhere.
            </p>
            <pre className="pre">{`// src/lib/config.ts
export const UPI = {
  id: "yourname@oksbi",        // ← your UPI ID
  payeeName: "Your Company",   // ← name payers will see
};`}</pre>
            <p className="sys-faint" style={{ fontSize: "0.82rem", margin: "0.9rem 0 0" }}>
              Save, redeploy, done — the three tiers below light up automatically. Optionally drop a QR
              screenshot at <code className="code">public/upi-qr.png</code> and it appears on its own.
            </p>
          </div>

          <div className="stack" style={{ marginTop: "1.5rem", opacity: 0.45 }}>
            {UPI.tiers.map((t) => (
              <div key={t.amount} className="tier tier-disabled" aria-disabled="true">
                <span>
                  <span className="tier-label">{t.label}</span>
                  <span className="tier-perk">{t.perk}</span>
                </span>
                <span className="tier-amount mono">₹{t.amount}</span>
              </div>
            ))}
          </div>
        </SystemWindow>
      )}

      {/* --------------------------- other help --------------------------- */}
      <SystemWindow label="free ways to help" variant="quiet">
        <p className="sys-dim" style={{ fontSize: "0.92rem" }}>
          Money is the least useful thing you can give an app this young. More valuable: tell one person
          who keeps starting and stopping, and tell us what broke for you.
        </p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {BRAND.supportEmail && (
            <a className="btn btn-ghost btn-sm" href={`mailto:${BRAND.supportEmail}`}>
              Email us
            </a>
          )}
          {socials.map(([k, url]) => (
            <a
              key={k}
              className="btn btn-ghost btn-sm"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {k === "x" ? "X / Twitter" : k[0].toUpperCase() + k.slice(1)}
            </a>
          ))}
          <Link className="btn btn-ghost btn-sm" href="/dashboard">
            Back to today
          </Link>
        </div>
        {!BRAND.supportEmail && socials.length === 0 && (
          <p className="sys-faint" style={{ fontSize: "0.8rem", margin: "0.9rem 0 0" }}>
            Contact links appear here once you fill in{" "}
            <code className="code">BRAND.supportEmail</code> or any{" "}
            <code className="code">STARTUP.socials</code> entry.
          </p>
        )}
      </SystemWindow>

      <StartupSlot />
    </div>
  );
}
