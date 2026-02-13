// frontend/web/src/lib/rewards.ts
import { apiJson } from "./api";

export type RewardsStatus = {
  streak: number;
  claimedToday: boolean;
  canClaim: boolean;
  missesRemaining: number;
  nextDayIndex: number;
  week1: boolean;
  preview: { kind: string; label: string };
};

export type ClaimRewardResponse = {
  ok: boolean;
  reward?: { kind: string; label: string };
  streak?: number;
  dayIndex?: number;
  reset?: boolean;
};

export async function getRewardsStatus(): Promise<RewardsStatus> {
  // IMPORTANT: your backend mounts this at /api/rewards/status
  return apiJson<RewardsStatus>("/api/rewards/status");
}

export async function claimReward(): Promise<ClaimRewardResponse> {
  return apiJson<ClaimRewardResponse>("/api/rewards/claim", { method: "POST" });
}
