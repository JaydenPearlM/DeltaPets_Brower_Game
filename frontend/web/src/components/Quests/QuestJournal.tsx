import { useEffect, useMemo, useState } from "react";
import {
  fetchWildwoodStatus,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import "./QuestJournal.css";
import { kithnaJournalEntries, type QuestJournalEntry } from "../../pages/Cities/Kithna/KithnaQuest/kithnaJournalEntries";
import { useGame } from "../../app/providers/GameProvider";

type QuestJournalProps = {
  onClose: () => void;
};

function statusLabel(status: QuestJournalEntry["status"]) {
  switch (status) {
    case "active":
      return "In progress";

    case "ready_to_turn_in":
      return "Objective complete";

    case "completed":
      return "Completed";

    default:
      return "Available";
  }
}

export default function QuestJournal({ onClose }: QuestJournalProps) {
  const { refreshKey } = useGame();
  const [wildwood, setWildwood] = useState<WildwoodStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    void fetchWildwoodStatus()
      .then((result) => {
        if (!cancelled) {
          setWildwood(result);
        }
      })
      .catch((problem) => {
        if (!cancelled) {
          setError(
            problem instanceof Error
              ? problem.message
              : "Quest journal could not load.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const entries = useMemo<QuestJournalEntry[]>(() => {
    if (!wildwood) {
      return [];
    }

    return kithnaJournalEntries(wildwood);
  }, [wildwood]);

  const active = entries.filter(
    (entry) => entry.status === "active" || entry.status === "ready_to_turn_in",
  );

  const completed = entries.filter((entry) => entry.status === "completed");

  const activeMain = active.filter((entry) => entry.category === "main");
  const activeSide = active.filter((entry) => entry.category === "side");

  const completedMain = completed.filter((entry) => entry.category === "main");
  const completedSide = completed.filter((entry) => entry.category === "side");

  function renderEntry(entry: QuestJournalEntry) {
    const hasProgress =
      typeof entry.progress === "number" && typeof entry.target === "number";

    const percent =
      hasProgress && entry.target! > 0
        ? Math.min(100, Math.round((entry.progress! / entry.target!) * 100))
        : 0;

    return (
      <article
        key={entry.key}
        className={[
          "questJournalCard",
          entry.category === "main" ? "questJournalCard--main" : "questJournalCard--side",
          entry.status === "completed" ? "questJournalCard--completed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="questJournalCardHeader">
          <div className="questJournalTitleGroup">
            <h3>{entry.title}</h3>
          </div>

          <span className="questJournalStatus">
            {statusLabel(entry.status)}
          </span>
        </div>

        <p className="questJournalDescription">{entry.description}</p>

        {hasProgress ? (
          <div className="questJournalProgress">
            <div className="questJournalProgressText">
              <span>{entry.objectiveLabel ?? "Progress"}</span>

              <strong>
                {entry.progress} / {entry.target}
              </strong>
            </div>

            <div className="questJournalProgressTrack" aria-hidden="true">
              <div
                className="questJournalProgressFill"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : null}

        {entry.status === "ready_to_turn_in" ? (
          <div className="questJournalReturnNotice">
            <strong>Objective complete</strong>
            <span>Return to the quest giver.</span>
          </div>
        ) : null}

        {entry.status === "completed" ? (
          <p className="questJournalCompletedText">Quest complete.</p>
        ) : null}
      </article>
    );
  }

  function renderQuestGroups(
    mainQuests: QuestJournalEntry[],
    sideQuests: QuestJournalEntry[],
    emptyMessage: string,
  ) {
    if (!mainQuests.length && !sideQuests.length) {
      return <div className="questJournalEmpty">{emptyMessage}</div>;
    }

    return (
      <div className="questJournalGroups">
        {mainQuests.length ? (
          <div className="questJournalGroup">
            <div className="questJournalGroupHeading">
              <span className="questJournalMainStar" aria-hidden="true">
                ★
              </span>
              Main Quests
            </div>

            <div className="questJournalGroupEntries">
              {mainQuests.map(renderEntry)}
            </div>
          </div>
        ) : null}

        {sideQuests.length ? (
          <div className="questJournalGroup">
            <div className="questJournalGroupHeading">Side Quests</div>

            <div className="questJournalGroupEntries">
              {sideQuests.map(renderEntry)}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="questJournal" aria-label="Quest Journal">
      <header className="questJournalHeader">
        <div>
          <h2>Quest Journal</h2>
        </div>

        <button
          type="button"
          className="questJournalClose"
          aria-label="Close quest journal"
          onClick={onClose}
        >
          CLOSE
        </button>
      </header>

      {loading ? (
        <div className="questJournalMessage">Loading quests…</div>
      ) : null}

      {error ? (
        <div className="questJournalMessage questJournalMessage--error">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="questJournalScrollArea">
          <section className="questJournalSection">
            <div className="questJournalSectionHeading">Current Quests</div>

            {renderQuestGroups(activeMain, activeSide, "No current quests.")}
          </section>

          <section className="questJournalSection">
            <div className="questJournalSectionHeading">Completed</div>

            {renderQuestGroups(
              completedMain,
              completedSide,
              "No completed quests yet.",
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
