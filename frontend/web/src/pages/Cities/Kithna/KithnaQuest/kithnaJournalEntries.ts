import type { WildwoodStatus } from "../../../../lib/kithna/wildwoodApi";

type QuestStatus = "available" | "active" | "ready_to_turn_in" | "completed";

type QuestCategory = "main" | "side";

export type QuestJournalEntry = {
  key: string;
  title: string;
  description: string;
  category: QuestCategory;
  status: QuestStatus;
  progress?: number;
  target?: number;
  objectiveLabel?: string;
};

export function kithnaJournalEntries(wildwood: WildwoodStatus): QuestJournalEntry[] {
    const quests: QuestJournalEntry[] = [];

    if (wildwood.quest.status !== "available") {
      quests.push({
        key: wildwood.quest.key,
        title: "Something’s Afoot",
        description:
          "A researcher in Kithna is working on a strange device he calls an Aliune Signal. Location: Kithna Wildwood. Defeat 5 corrupted Kith in Wildwood. Reward: Permanent Aliune Signal feature unlock.",
        category: "main",
        status: wildwood.quest.status,
        progress: wildwood.quest.progress,
        target: wildwood.quest.target,
        objectiveLabel: "Corrupted Kith defeated in Wildwood",
      });
    }

    if (wildwood.foodQuest.status !== "available") {
      quests.push({
        key: wildwood.foodQuest.key,
        title: "A Merchant’s Trouble",
        description:
          "Strange Kith have been eating Assanti’s plants and attacking her meat tree. Quest giver: Assanti. Location: Kithna / Wildwood. Defeat 3 corrupted Kith in Wildwood. Reward: Permanent access to Assanti’s daily food claim (10 Meat and 10 Vegetables every 24 hours).",
        category: "side",
        status: wildwood.foodQuest.status,
        progress: wildwood.foodQuest.progress,
        target: wildwood.foodQuest.target,
        objectiveLabel: "Corrupted Kith defeated in Wildwood",
      });
    }

    return quests;
}
