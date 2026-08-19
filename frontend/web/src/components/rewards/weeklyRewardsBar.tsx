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
  { day: "Tue", label: "200 Dots" },
  { day: "Wed", label: "Haiku Scroll #50" },
  { day: "Thu", label: "Potions" },
  { day: "Fri", label: "EXP +100" },
  { day: "Sat", label: "500 Dots" },
  { day: "Sun", label: "Alpha Tester Ribbon" },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function WeeklyRewardsBar({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      const s = await getRewardsStatus();
      setStatus(s);
    } catch (e: unknown) {
      setStatus(null);
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const nextIdx = status?.nextDayIndex ?? 0;

  const claimedCount = useMemo(() => {
    const streak = status?.streak ?? 0;

    if (streak <= 0) return 0;
    if (streak % 7 === 0 && status?.canClaim) return 0;

    return ((streak - 1) % 7) + 1;
  }, [status]);

  const rewardSlots = useMemo(() => {
    if (!status) return WEEK1_LABELS;

    const weekRewards = (
      status as RewardsStatus & {
        weekRewards?: Array<{ kind: string; label: string }>;
      }
    ).weekRewards;

    if (!weekRewards || weekRewards.length !== 7) {
      return WEEK1_LABELS;
    }

    return weekRewards.map((reward, i) => ({
      day: String(i),
      label: reward.label,
    }));
  }, [status]);

  async function onClaim() {
    if (!status?.canClaim || busy) return;
    setBusy(true);
    setToast(null);

    try {
      const result = await claimReward();
      setToast(`Claimed: ${result.reward?.label ?? "Reward"}`);
      await refresh();
    } catch (e: unknown) {
      setToast(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  //  If API fails, show the real error instead of infinite "Loading..."
  if (!status) {
    return (
      <div className="wr-wrap dp-blue-grid-panel">
        <div className="wr-header">
          <div className="wr-title">Daily Rewards</div>
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
    <div className="wr-wrap dp-blue-grid-panel">
      <div className="wr-header">
        <div className="wr-title">Daily Rewards</div>
      </div>

      <div className="wr-bar">
        {rewardSlots.map((slot, i) => {
          const claimed = i < claimedCount;
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
              <div className="wr-reward">{slot.label}</div>
              <div className="wr-state">
                {claimed ? "Claimed" : claimable ? "Ready" : "Locked"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wr-actions">
        <button type="button" className="dp-close-button" onClick={onClose}>
          Close
        </button>

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
      </div>

      {toast && <div className="wr-toast">{toast}</div>}
    </div>
  );
}
