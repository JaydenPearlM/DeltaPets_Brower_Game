import type { SomethingsAfootStatus } from "../../../../lib/kithna/wildwoodApi";
import type { KithnaQuestKind } from "./useKithnaQuests";

type Props = {
  kind: KithnaQuestKind;
  status?: SomethingsAfootStatus;
  anchored?: boolean;
};

export default function KithnaQuestMarker({ kind, status, anchored }: Props) {
  if (status !== "available" && status !== "ready_to_turn_in") return null;
  const ready = status === "ready_to_turn_in";
  return (
    <span
      className={[
        "kithnaQuestMarker",
        kind === "main" ? "kithnaQuestMarker--wildwood kithnaQuestMarker--main" : "kithnaQuestMarker--food",
        anchored ? "kithnaQuestMarker--anchored" : "",
        ready ? "kithnaQuestMarker--turn-in" : "",
      ].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {ready ? "?" : "!"}
      {kind === "main" ? <span className="kithnaQuestMarkerStar" aria-hidden="true">★</span> : null}
    </span>
  );
}
