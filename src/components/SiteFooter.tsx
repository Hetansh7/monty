import Link from "next/link";
import { BRAND, STARTUP } from "@/lib/config";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const owner = STARTUP.legalName.trim() || BRAND.name;

  return (
    <footer className="footer">
      <div className="wrap row-between">
        <div>
          <div className="mono">
            © {year} {owner}
          </div>
          <div className="sys-faint" style={{ fontSize: "0.78rem", marginTop: "0.2rem" }}>
            Original archetypes and public-domain historical figures only.
          </div>
        </div>
        <div className="row" style={{ gap: "1rem" }}>
          <Link href="/support">Support</Link>
          {BRAND.supportEmail && <a href={`mailto:${BRAND.supportEmail}`}>Contact</a>}
          {STARTUP.website && (
            <a href={STARTUP.website} target="_blank" rel="noopener noreferrer">
              Company
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
