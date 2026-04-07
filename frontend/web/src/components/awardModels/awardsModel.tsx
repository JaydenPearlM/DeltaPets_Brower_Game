import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import "./awardsModel.css";

type AwardRow = {
  id: string;
  name: string;
  type: "ribbon" | "trophy" | string;
  icon_url: string | null;
  rarity: string | null;
};

type PetAwardRow = {
  id: string;
  earned_at: string;
  awards: AwardRow | null; // joined (can be null)
};

function looksLikeImageUrl(url: string) {
  // accept common image extensions + basic "data:" urls
  return (
    url.startsWith("data:image/") ||
    /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url)
  );
}

/**
 * Supabase icon_url should ideally be:
 * - absolute: https://...
 * - or public path: /awards/alpha_tester.png  (served from Vite public/)
 *
 * If someone accidentally stored a dev path like /src/... it will 404.
 * We guard against that and return null -> placeholder.
 */
function resolveIconUrl(icon_url: string | null): string | null {
  if (!icon_url) return null;

  const raw = icon_url.trim();
  if (!raw) return null;

  // kill obviously-wrong source paths (your current 404)
  if (raw.startsWith("/src/") || raw.includes("/src/")) return null;

  // if it doesn't look like an image, don't try to load it
  if (!looksLikeImageUrl(raw)) return null;

  // allow absolute URLs
  if (/^https?:\/\//i.test(raw)) return raw;

  // allow already-rooted public paths
  if (raw.startsWith("/")) return raw;

  // otherwise treat it as public/relative
  return `/${raw}`;
}

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

  // Close on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!petId) {
      setLoading(false);
      setRows([]);
      setErr(null);
      return;
    }

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
        setLoading(false);
        return;
      }

      setRows((data ?? []) as unknown as PetAwardRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [petId]);

  const normalized = useMemo(() => {
    return rows.map((r) => {
      const award = r.awards;
      return {
        ...r,
        awards: award
          ? {
              ...award,
              icon_url: resolveIconUrl(award.icon_url),
            }
          : null,
      };
    });
  }, [rows]);

  return (
    <div
      className="dp-modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dp-modal">
        <div className="dp-modalHeader">
          <h2>Ribbons &amp; Trophies</h2>
          <button className="dp-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {!petId && <p>No pet selected.</p>}
        {petId && loading && <p>Loading awards…</p>}
        {petId && err && <p style={{ color: "crimson" }}>{err}</p>}

        {petId && !loading && !err && normalized.length === 0 && (
          <p>No awards yet. Time to bully the leaderboard 😈</p>
        )}

        {petId && !loading && !err && normalized.length > 0 && (
          <div className="dp-awardsGrid">
            {normalized.map((r) => {
              const a = r.awards;
              const title = a?.name ?? "Award";
              const type = a?.type ?? "ribbon";
              const rarity = a?.rarity ?? "common";
              const icon = a?.icon_url ?? null;

              return (
                <div key={r.id} className="dp-awardCard">
                  {icon ? (
                    <img
                      src={icon}
                      alt={title}
                      className="dp-awardIcon"
                      loading="lazy"
                      onError={(e) => {
                        // if something still fails, swap to placeholder without infinite spam
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div className="dp-awardIconPlaceholder" />
                  )}

                  <div className="dp-awardMeta">
                    <div className="dp-awardName">{title}</div>
                    <div className="dp-awardSub">
                      {type} • {rarity}
                    </div>
                    <div className="dp-awardDate">
                      {new Date(r.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
