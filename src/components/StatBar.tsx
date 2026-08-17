import type { CSSProperties } from "react";
import { formatSeconds } from "@/lib/game";

/**
 * One stat, with an honest lock indicator.
 *
 * `locked` is on for every normal day. It's a deliberate design decision:
 * the user should *see* that today's effort cannot nudge this number. That
 * frustration is the motivation — it's what makes the Trial matter.
 */
export default function StatBar({
  name,
  value,
  colorVar,
  locked = false,
  delta,
}: {
  name: string;
  value: number;
  colorVar: string;
  locked?: boolean;
  delta?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const showDelta = typeof delta === "number" && delta !== 0;
  const deltaClass = !showDelta ? "delta-flat" : delta > 0 ? "delta-up" : "delta-down";

  return (
    <div className={`statbar${locked ? " statbar-locked" : ""}`}>
      <div className="statbar-top">
        <span className="statbar-name">{name}</span>
        <span>
          <span className="statbar-value">{value}</span>
          {showDelta && (
            <span className={`statbar-delta ${deltaClass}`}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
      </div>
      <div
        className="statbar-track"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={name}
      >
        <div
          className="statbar-fill"
          style={{ width: `${pct}%`, "--bar-color": `var(${colorVar})` } as CSSProperties}
        />
      </div>
      {locked && (
        <div className="statbar-lock" style={{ marginTop: "0.3rem" }}>
          🔒 locked until your next trial
        </div>
      )}
    </div>
  );
}

/** Small read-out used for raw measurements (reps, or mm:ss for time). */
export function MeasureReadout({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: "reps" | "seconds";
}) {
  return (
    <div>
      <div className="statbar-name">{label}</div>
      <div className="big-num" style={{ color: "var(--glow)" }}>
        {unit === "seconds" ? formatSeconds(value) : value}
      </div>
      <div className="sys-faint mono" style={{ fontSize: "0.7rem" }}>
        {unit === "seconds" ? "min:sec" : "reps"}
      </div>
    </div>
  );
}
