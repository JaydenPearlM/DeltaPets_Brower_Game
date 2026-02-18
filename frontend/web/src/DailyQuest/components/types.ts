// src/dailyQuest/types.ts

export type DailyCareStatus = {
  streak: number;
  lastCompletedAt: string | null;
  canCompleteToday: boolean;
  alphaRibbonAwarded?: boolean;
};

export type DailyCareAction = "feed" | "clean" | "play" | "bond";

export type DailyCareResult = {
  success: boolean;
  streak: number;
  reward?: {
    kind: "dots" | "xp" | "item";
    amount?: number;
    slug?: string;
    qty?: number;
  };
  message?: string;
};
