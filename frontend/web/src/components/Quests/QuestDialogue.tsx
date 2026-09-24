import "./QuestDialogue.css";

type QuestDialogueProps = {
  giverName: string;
  portraitSrc?: string | null;
  portraitAlt?: string;
  title: string;
  dialogue: string;
  objective: string;
  acceptLabel?: string;
  onAccept?: () => void;
  onClose: () => void;
  busy?: boolean;
  mode?: "offer" | "turn-in";
};

export default function QuestDialogue({
  giverName,
  portraitSrc,
  portraitAlt,
  title,
  dialogue,
  objective,
  acceptLabel,
  onAccept,
  onClose,
  busy = false,
  mode = "offer",
}: QuestDialogueProps) {
  return (
    <div
      className="questDialogueBackdrop dpPopupWindowBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} quest dialogue`}
    >
      <section className="questDialogueWindow dpPopupWindow">
        <button
          type="button"
          className="questDialogueClose"
          aria-label="Close quest dialogue"
          onClick={onClose}
        >
          ×
        </button>

        <div className="questDialoguePortraitFrame">
          {portraitSrc ? (
            <img
              className="questDialoguePortrait"
              src={portraitSrc}
              alt={portraitAlt ?? giverName}
            />
          ) : (
            <div
              className="questDialoguePortraitPlaceholder"
              aria-label={`${giverName} portrait slot`}
            >
              <span>NPC PORTRAIT</span>
            </div>
          )}
        </div>

        <div className="questDialogueBody">
          <p className="questDialogueGiver">{giverName}</p>

          <h2>{title}</h2>

          <p className="questDialogueText">{dialogue}</p>

          <div className="questDialogueObjective">
            <span>{mode === "turn-in" ? "Quest complete" : "Objective"}</span>

            <strong>{objective}</strong>
          </div>

          <div className="questDialogueActions">
            <button
              type="button"
              className="dp-btn dp-btn--blue"
              disabled={busy}
              onClick={onClose}
            >
              Not now
            </button>

            {onAccept ? (
              <button
                type="button"
                className="dp-btn dp-btn--yellow"
                disabled={busy}
                onClick={onAccept}
              >
                {busy
                  ? "Working…"
                  : (acceptLabel ??
                    (mode === "turn-in" ? "Complete Quest" : "Accept Quest"))}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
