import type { ReactNode } from "react";

/**
 * THE SIGNATURE ELEMENT — a notched, bevelled panel that boots in with a
 * sweep of light, so every surface in the app reads as the System talking
 * to you rather than a web page about training.
 */
export default function SystemWindow({
  label,
  right,
  variant = "default",
  className = "",
  children,
}: {
  label?: string;
  right?: ReactNode;
  variant?: "default" | "glow" | "quiet";
  className?: string;
  children: ReactNode;
}) {
  const variantClass =
    variant === "glow" ? " sysw-glow" : variant === "quiet" ? " sysw-quiet" : "";

  return (
    <section className={`sysw${variantClass}${className ? " " + className : ""}`}>
      {(label || right) && (
        <header className="sysw-head">
          {label ? <span className="sys-label">{label}</span> : <span />}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}
