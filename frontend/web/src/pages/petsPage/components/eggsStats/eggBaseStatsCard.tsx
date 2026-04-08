import type { PetStatsRow } from "../../petTypes";

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <span style={{ fontWeight: 800 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function EggBaseStatsCard({ stats }: { stats: PetStatsRow | null }) {
  if (!stats) return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
      }}
    >
      <p style={{ margin: 0, fontWeight: 800 }}>Selected Egg Stats</p>
      <p style={{ margin: "6px 0 10px", opacity: 0.8 }}>
        These are the egg’s base stats (total should be 10).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <StatRow label="HP" value={stats.hp} />
        <StatRow label="ATK" value={stats.atk} />
        <StatRow label="DEF" value={stats.def} />
        <StatRow label="SPD" value={stats.spd} />
        <StatRow label="MAGI" value={stats.magi} />
        <StatRow label="MANA" value={stats.mana} />
      </div>

      <div style={{ marginTop: 10, opacity: 0.85 }}>
        <strong>Total:</strong> {stats.base_total}
      </div>

      <div style={{ marginTop: 10, opacity: 0.7 }}>
        On hatch (Level 1), the game will apply{" "}
        <strong>+7 random points</strong>.
      </div>
    </div>
  );
}
