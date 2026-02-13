import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

type AwardRow = {
  id: string;
  name: string;
  type: "ribbon" | "trophy";
  icon_url: string | null;
  rarity: string | null;
};

type PetAwardRow = {
  id: string;
  earned_at: string;
  awards: AwardRow; // joined
};

export function AwardsModal({
  petId,
  onClose,
}: {
  petId?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PetAwardRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("pet_awards")
        .select(
          `
          id,
          earned_at,
          awards:award_id (
            id,
            name,
            type,
            icon_url,
            rarity
          )
        `,
        )
        .eq("pet_id", petId)
        .order("earned_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRows([]);
      } else {
        setRows((data as any) ?? []);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [petId]);

  return (
    <div className="dp-modalOverlay" role="dialog" aria-modal="true">
      <div className="dp-modal">
        <div className="dp-modalHeader">
          <h2>Ribbons & Trophies</h2>
          <button className="dp-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p>Loading awards…</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        {!loading && !err && rows.length === 0 && (
          <p>No awards yet. Time to bully the leaderboard 😈</p>
        )}

        <div className="dp-awardsGrid">
          {rows.map((r) => (
            <div key={r.id} className="dp-awardCard">
              {r.awards?.icon_url ? (
                <img
                  src={r.awards.icon_url}
                  alt={r.awards.name}
                  className="dp-awardIcon"
                />
              ) : (
                <div className="dp-awardIconPlaceholder" />
              )}

              <div className="dp-awardMeta">
                <div className="dp-awardName">{r.awards?.name ?? "Award"}</div>
                <div className="dp-awardSub">
                  {r.awards?.type ?? "ribbon"} • {r.awards?.rarity ?? "common"}
                </div>
                <div className="dp-awardDate">
                  {new Date(r.earned_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
