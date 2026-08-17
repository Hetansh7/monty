import { STARTUP, isStartupConfigured } from "@/lib/config";

/**
 * ===== RESERVED SPACE FOR YOUR STARTUP =====
 * While every STARTUP field in src/lib/config.ts is empty this renders a
 * tidy "reserved" panel. Fill any field in and it turns into a real
 * about-the-company block. No code change needed either way.
 */
export default function StartupSlot() {
  if (!isStartupConfigured()) {
    return (
      <div className="slot">
        <div className="slot-tag">reserved · your startup</div>
        <p className="sys-dim" style={{ margin: "0.5rem 0 0", fontSize: "0.92rem" }}>
          This block is waiting for you. Open{" "}
          <code className="mono">src/lib/config.ts</code> and fill in the{" "}
          <code className="mono">STARTUP</code> section — company name, one paragraph about you, city,
          and your links. It appears here automatically.
        </p>
      </div>
    );
  }

  const socials = [
    { label: "X", href: STARTUP.socials.x },
    { label: "Instagram", href: STARTUP.socials.instagram },
    { label: "YouTube", href: STARTUP.socials.youtube },
    { label: "Discord", href: STARTUP.socials.discord },
  ].filter((s) => s.href.trim().length > 0);

  return (
    <div className="sysw sysw-quiet">
      <div className="sys-label">who built this</div>
      {STARTUP.legalName && (
        <h3 style={{ marginTop: "0.6rem", fontSize: "1.25rem" }}>{STARTUP.legalName}</h3>
      )}
      {STARTUP.about && <p className="sys-dim">{STARTUP.about}</p>}

      <div className="row" style={{ gap: "1rem" }}>
        {STARTUP.location && <span className="sys-faint mono">{STARTUP.location}</span>}
        {STARTUP.website && (
          <a href={STARTUP.website} target="_blank" rel="noopener noreferrer">
            Website
          </a>
        )}
        {socials.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}
