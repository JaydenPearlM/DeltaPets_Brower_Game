import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchWildwoodStatus,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import "./QuestJournal.css";

type QuestStatus = "available" | "active" | "ready_to_turn_in" | "completed";

type QuestCategory = "main" | "aliune";

type QuestJournalEntry = {
  key: string;
  title: string;
  description: string;
  category: QuestCategory;
  location: string;
  route: string;
  status: QuestStatus;
  progress?: number;
  target?: number;
  objectiveLabel?: string;
};

type QuestJournalProps = {
  onClose: () => void;
};

function statusLabel(status: QuestStatus) {
  switch (status) {
    case "active":
      return "In progress";

    case "ready_to_turn_in":
      return "Return to quest giver";

    case "completed":
      return "Completed";

    default:
      return "Available";
  }
}

export default function QuestJournal({ onClose }: QuestJournalProps) {
  const navigate = useNavigate();

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
  }, []);

  const entries = useMemo<QuestJournalEntry[]>(() => {
    if (!wildwood) {
      return [];
    }

    return [
      {
        key: wildwood.quest.key,
        title: "Something’s Afoot",
        description:
          "A researcher in Kithna is working on a mysterious design. He needs you to investigate the Wildwood and defeat five corrupted Kith before returning to him.",
        category: "aliune",
        location: "Kithna · Wildwood",
        route: "/kithna/wildwood",
        status: wildwood.quest.status,
        progress: wildwood.quest.progress,
        target: wildwood.quest.target,
        objectiveLabel: "Corrupted Kith defeated",
      },
    ];
  }, [wildwood]);

  const active = entries.filter(
    (entry) => entry.status === "active" || entry.status === "ready_to_turn_in",
  );

  const completed = entries.filter((entry) => entry.status === "completed");

  function goTo(entry: QuestJournalEntry) {
    onClose();
    navigate(entry.route);
  }

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
        className={`questJournalCard${
          entry.status === "completed" ? " questJournalCard--completed" : ""
        }`}
      >
        <div className="questJournalCardHeader">
          <div>
            <h3>{entry.title}</h3>

            <div className="questJournalLocation">{entry.location}</div>
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

        {entry.status === "completed" ? (
          <p className="questJournalCompletedText">Quest complete.</p>
        ) : (
          <button
            type="button"
            className="dp-btn dp-btn--blue questJournalLocationButton"
            onClick={() => goTo(entry)}
          >
            Go to quest location
          </button>
        )}
      </article>
    );
  }

  return (
    <section className="questJournal" aria-label="Quest Journal">
      <header className="questJournalHeader">
        <div>
          <p className="questJournalEyebrow">Keeper Log</p>

          <h2>Quest Journal</h2>
        </div>

        <button
          type="button"
          className="questJournalClose"
          aria-label="Close quest journal"
          onClick={onClose}
        >
          ×
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
        <>
          <section className="questJournalSection">
            <div className="questJournalSectionHeading">Current Quests</div>

            {active.length ? (
              active.map(renderEntry)
            ) : (
              <div className="questJournalEmpty">No current quests.</div>
            )}
          </section>

          <section className="questJournalSection">
            <div className="questJournalSectionHeading">Completed</div>

            {completed.length ? (
              completed.map(renderEntry)
            ) : (
              <div className="questJournalEmpty">No completed quests yet.</div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
