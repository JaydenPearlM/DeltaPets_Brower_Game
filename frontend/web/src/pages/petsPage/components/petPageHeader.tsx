import { useNavigate } from "react-router-dom";

export function PetPageHeader({
  activePetId,
  onOpenRewards,
  onOpenAwards,
}: {
  activePetId: string | null;
  onOpenRewards: () => void;
  onOpenAwards: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <h1>User and Pets Page (gotta find a new name for this page.)</h1>

      <div
        style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}
      >
        <button type="button" onClick={() => navigate("/hatchery")}>
          Hatchery (test)
        </button>

        <button type="button" onClick={onOpenRewards}>
          🎁 Daily Rewards
        </button>

        <button
          type="button"
          className="dp-tab"
          onClick={onOpenAwards}
          disabled={!activePetId}
          title={!activePetId ? "No active pet yet" : "View ribbons & trophies"}
        >
          🎀 Ribbons
        </button>
      </div>
    </>
  );
}
