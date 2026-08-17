import { rankFor, type RankId } from "@/lib/game";

/** The hexagonal rank sigil. Colour is the progression: grey → cyan → violet → magenta → gold → white. */
export default function RankBadge({
  rankId,
  showTitle = true,
  animate = false,
}: {
  rankId: RankId | string;
  showTitle?: boolean;
  animate?: boolean;
}) {
  const id = (["E", "D", "C", "B", "A", "S"].includes(rankId) ? rankId : "E") as RankId;
  const def = rankFor(0);
  const title = ({ E: "Unranked", D: "Initiate", C: "Adept", B: "Veteran", A: "Elite", S: "Ascendant" } as Record<
    RankId,
    string
  >)[id] ?? def.title;

  return (
    <div className="row" style={{ gap: "0.9rem" }}>
      <div className={`rank-badge rank-${id}${animate ? " rankup" : ""}`} aria-label={`Rank ${id}`}>
        {id}
      </div>
      {showTitle && (
        <div>
          <div className="sys-label">rank</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>{title}</div>
        </div>
      )}
    </div>
  );
}
