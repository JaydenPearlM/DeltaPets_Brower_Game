// frontend/web/src/components/rewards/weeklyRewardsBar.tsx
import { useEffect, useMemo, useState } from "react";
import {
  claimReward,
  getRewardsStatus,
  type RewardsStatus,
} from "./claimRewards";
import "./weeklyRewardsBar.css";

const WEEK1_LABELS = [
  { day: "Mon", label: "300 Dots" },
  { day: "Tue", label: "5 Crystals" },
  { day: "Wed", label: "Starter Gear" },
  { day: "Thu", label: "Potions" },
  { day: "Fri", label: "EXP +100" },
  { day: "Sat", label: "500 Dots" },
  { day: "Sun", label: "Trough (50)" },
];

export function WeeklyRewardsBar() {
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      const s = await getRewardsStatus();
      setStatus(s);
    } catch (e: any) {
      setStatus(null);
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const nextIdx = status?.nextDayIndex ?? 0;

  const claimedCount = useMemo(() => {
    const streak = status?.streak ?? 0;
    return Math.min(streak, 7);
  }, [status]);

  async function onClaim() {
    if (!status?.canClaim || busy) return;
    setBusy(true);
    setToast(null);

    try {
      const result = await claimReward();
      setToast(`Claimed: ${result.reward?.label ?? "Reward"}`);
      await refresh();
    } catch (e: any) {
      setToast(e?.message ?? "Claim failed.");
    } finally {
      setBusy(false);
    }
  }

  //  If API fails, show the real error instead of infinite "Loading..."
  if (!status) {
    return (
      <div className="wr-wrap">
        <div className="wr-header">
          <div className="wr-title">Weekly Rewards</div>
        </div>

        {error ? (
          <div style={{ marginTop: 8, color: "salmon" }}>
            Failed to load rewards: {error}
            <div style={{ marginTop: 10 }}>
              <button
                className="wr-claimBtn"
                onClick={() => refresh()}
                disabled={busy}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="wr-bar wr-loading">Loading rewards…</div>
        )}

        {toast && <div className="wr-toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="wr-wrap">
      <div className="wr-header">
        <div className="wr-title">Weekly Rewards</div>
        <div className="wr-meta">
          <span>
            Misses left: <b>{status.missesRemaining}</b>
          </span>
          <span>
            Streak: <b>{status.streak}</b>
          </span>
        </div>
      </div>

      <div className="wr-bar">
        {WEEK1_LABELS.map((slot, i) => {
          const claimed = i < claimedCount && status.streak <= 7;
          const isNext = i === nextIdx;
          const claimable = isNext && status.canClaim;

          return (
            <div
              key={slot.day}
              className={[
                "wr-slot",
                claimed ? "is-claimed" : "",
                isNext ? "is-next" : "",
                claimable ? "is-claimable" : "",
              ].join(" ")}
              title={slot.label}
            >
              <div className="wr-day">{slot.day}</div>
              <div className="wr-reward">{slot.label}</div>
              <div className="wr-state">
                {claimed ? "Claimed" : claimable ? "Ready" : "Locked"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wr-actions">
        <button
          className="wr-claimBtn"
          onClick={onClaim}
          disabled={!status.canClaim || busy}
        >
          {status.claimedToday
            ? "Claimed"
            : busy
              ? "Claiming…"
              : "Claim Reward"}
        </button>

        <div className="wr-preview">
          Next: <b>{status.preview?.label ?? ""}</b>
          {!status.week1 && (
            <span className="wr-randomTag"> (Random pool)</span>
          )}
        </div>
      </div>

      {toast && <div className="wr-toast">{toast}</div>}
    </div>
  );
}
