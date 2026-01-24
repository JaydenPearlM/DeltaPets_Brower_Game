import { useEffect, useState } from "react";

export type DailyReward =
  | { type: "WARM_EGG" }
  | { type: "BOND_BOOST" }
  | { type: "CRYSTALS"; amount: number }
  | { type: "DOTS"; amount: number };

export type DailyStatus = {
  canClaim: boolean;
  streak: number;
  lastClaimedAt: string | null;
};

export type DailyClaimResult = {
  streak: number;
  rewards: DailyReward[];
  claimedAt: string;
};

export async function getDailyStatus(): Promise<DailyStatus> {
  const res = await fetch("/api/rewards/daily", {
    credentials: "include",
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function claimDailyReward(): Promise<DailyClaimResult> {
  const res = await fetch("/api/rewards/daily/claim", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Hook wrapper (what you were trying to write)
 * Server is authoritative; UI just reflects status.
 */
export function useRewardsDaily() {
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const s = await getDailyStatus();
      setStatus(s);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load daily status.");
    } finally {
      setLoading(false);
    }
  }

  async function claim() {
    const result = await claimDailyReward();
    // After claiming, refresh status so UI updates
    await refresh();
    return result;
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, loading, error, refresh, claim };
}
