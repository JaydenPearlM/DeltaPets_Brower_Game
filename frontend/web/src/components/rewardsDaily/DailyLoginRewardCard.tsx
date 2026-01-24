import { useEffect, useState } from "react";
import { claimDailyReward, getDailyStatus } from "./rewardsDaily";

export function DailyLoginRewardCard() {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const s = await getDailyStatus();
        if (!alive) return;
        setCanClaim(s.canClaim);
        setStreak(s.streak);
      } catch (e: any) {
        if (alive) setMsg(e?.message ?? "Failed to load daily reward.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function onClaim() {
    try {
      setClaiming(true);
      setMsg(null);

      const result = await claimDailyReward();
      setStreak(result.streak);
      setCanClaim(false);

      const pretty = result.rewards
        .map((r) => {
          if (r.type === "CRYSTALS") return `+${r.amount} Crystals`;
          if (r.type === "DOTS") return `+${r.amount} Dots`;
          if (r.type === "WARM_EGG") return `Warm Egg`;
          if (r.type === "BOND_BOOST") return `Bond Boost`;
          return "Reward";
        })
        .join(" + ");

      setMsg(
        result.streak % 7 === 0
          ? `Day 7 bonus! ${pretty}`
          : `Claimed: ${pretty}`,
      );
    } catch (e: any) {
      setMsg(e?.message ?? "Claim failed.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <div style={{ padding: 12 }}>Loading daily reward…</div>;

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Daily Login Reward</div>
      <div style={{ opacity: 0.85, marginBottom: 10 }}>
        Streak: {streak} day(s)
      </div>

      <button disabled={!canClaim || claiming} onClick={onClaim}>
        {canClaim
          ? claiming
            ? "Claiming…"
            : "Claim Reward"
          : "Already claimed today"}
      </button>

      {msg && <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div>}
    </div>
  );
}
