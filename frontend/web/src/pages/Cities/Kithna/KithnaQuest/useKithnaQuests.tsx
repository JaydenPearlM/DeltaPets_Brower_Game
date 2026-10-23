import { useEffect, useRef, useState } from "react";
import { useGame } from "../../../../app/providers/GameProvider";
import {
  acceptAssantiFoodQuest,
  acceptSomethingsAfoot,
  fetchWildwoodStatus,
  turnInAssantiFoodQuest,
  turnInSomethingsAfoot,
  type WildwoodStatus,
} from "../../../../lib/kithna/wildwoodApi";

import QuestDialogue from "../../../../components/Quests/QuestDialogue";


export type KithnaQuestKind = "food" | "main";

export function useKithnaQuests(
  continueTo: (route: string, status: WildwoodStatus | null) => void,
) {
  const { bumpRefreshKey } = useGame();
  const [wildwood, setWildwood] = useState<WildwoodStatus | null>(null);

  const [questDialogue, setQuestDialogue] = useState<"food" | "main" | "main-completed" | null>(
    null,
  );

  const [questBusy, setQuestBusy] = useState(false);

  const [statusError, setStatusError] = useState("");

  const [statusAttempt, setStatusAttempt] = useState(0);

  const pendingRoute = useRef<string | null>(null);

  const [questError, setQuestError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setStatusError("");

    void fetchWildwoodStatus()
      .then((result) => {
        if (!cancelled) {
          setWildwood(result);
        }
      })

      .catch((error: unknown) => {
        if (!cancelled) {
          setStatusError(
            error instanceof Error
              ? error.message
              : "Quest status could not be loaded.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [statusAttempt]);


  function finish(next = wildwood) {
    setQuestDialogue(null);
    const route = pendingRoute.current;
    pendingRoute.current = null;
    if (route) continueTo(route, next);
  }

  function openQuest(kind: KithnaQuestKind, route?: string) {
    if (!wildwood || questBusy) return;
    pendingRoute.current = route ?? null;
    setQuestError("");
    setQuestDialogue(kind);
  }

  function visit(route: string) {
    const kind = route === "/kithna/wildwood" ? "main"
      : route === "/kithna/food" ? "food" : null;
    if (kind && !wildwood) return;
    const quest = kind === "main" ? wildwood?.quest : wildwood?.foodQuest;
    if (kind && (quest?.status === "available" || quest?.status === "ready_to_turn_in")) {
      openQuest(kind, route);
      return;
    }
    continueTo(route, wildwood);
  }

  const dialogue = <>
          {questDialogue === "food" && wildwood ? (
            <QuestDialogue
              giverName="Assanti"
              title="A Merchant’s Trouble"
              dialogue={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "You actually did it! My plants are safe, the meat tree is still standing, and those Kith finally stopped tearing through my food supply. You helped me out, so I'll help you out too."
                  : "Some strange Kith have been getting into my meat and vegetable farm lately. I don't know what's got them so riled up, but they're tearing through my food supply! If you can drive all three of them off, I'll make sure you stay fed. You've got my word!"
              }
              objective={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "Daily Food is now available from Assanti."
                  : "Defeat 3 corrupted Kith in Wildwood."
              }
              mode={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "turn-in"
                  : "offer"
              }
              busy={questBusy}
              error={questError}
              onClose={() => finish()}
              onAccept={() => {
                if (questBusy) return;

                setQuestBusy(true);

                setQuestError("");

                const request =
                  wildwood.foodQuest.status === "ready_to_turn_in"
                    ? turnInAssantiFoodQuest()
                    : acceptAssantiFoodQuest();

                void request

                  .then((next) => {
                    setWildwood(next);

                    if (wildwood.foodQuest.status === "available") {
                      pendingRoute.current = null;
                    }
                    finish(next);

                    bumpRefreshKey();
                  })

                  .catch((error: unknown) => {
                    setQuestError(
                      error instanceof Error
                        ? error.message
                        : "Quest could not be updated. Try again.",
                    );
                  })

                  .finally(() => setQuestBusy(false));
              }}
            />
          ) : null}

          {questDialogue === "main" && wildwood ? (
            <QuestDialogue
              giverName="Kithna Researcher"
              title="Something’s Afoot"
              dialogue={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "That's exactly what I needed. Whatever is happening to those Kith, the readings aren't random. The Aliune Signal is picking up something real. Take this one with you. If the signal changes, we'll know there's more going on out there."
                  : "I've been working on this weird thing I call an Aliune Signal. It's supposed to help me understand what's happening around Kithna, but I need more information. Defeat five of those strange Kith in the Wildwood and bring me what you learn. Also... I may have accidentally made two of these."
              }
              objective={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "Permanently unlock the Aliune Signal feature."
                  : "Defeat 5 corrupted Kith in Wildwood."
              }
              mode={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "turn-in"
                  : "offer"
              }
              busy={questBusy}
              error={questError}
              onClose={() => finish()}
              onAccept={() => {
                if (questBusy) return;

                setQuestBusy(true);

                setQuestError("");

                const request =
                  wildwood.quest.status === "ready_to_turn_in"
                    ? turnInSomethingsAfoot()
                    : acceptSomethingsAfoot();

                void request

                  .then((next) => {
                    setWildwood(next);

                    if (wildwood.quest.status === "ready_to_turn_in") {
                      pendingRoute.current = null;
                      setQuestDialogue(next.quest.status === "completed" ? "main-completed" : null);
                    } else {
                      finish(next);
                    }

                    bumpRefreshKey();
                  })

                  .catch((error: unknown) => {
                    setQuestError(
                      error instanceof Error
                        ? error.message
                        : "Quest could not be updated. Try again.",
                    );
                  })

                  .finally(() => setQuestBusy(false));
              }}
            />
          ) : null}

          {questDialogue === "main-completed" ? (
            <QuestDialogue
              giverName="Kithna Researcher"
              title="Something’s Afoot"
              dialogue="Wildwood is open, be careful, corruption could be around"
              objective="Permanent Aliune Signal unlock."
              mode="turn-in"
              acceptLabel="Close"
              onAccept={() => setQuestDialogue(null)}
              onClose={() => setQuestDialogue(null)}
            />
          ) : null}

  </>;

  return { wildwood, statusError, loading: !wildwood && !statusError,
    retry: () => setStatusAttempt((attempt) => attempt + 1), openQuest, visit, dialogue };
}
