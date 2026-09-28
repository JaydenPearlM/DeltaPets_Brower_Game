import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api/baseClient";
import { AvatarPreview } from "@/components/Profile/Customization/AvatarPreview";
import { DEFAULT_AVATAR, type AvatarCustomization } from "@/components/Profile/Customization/avatarTypes";
import "./ProfilePage.css";

type PlayerProfile = {
  playerId: string;
  displayName: string;
  username: string | null;
  joinedAt: string;
  title: string | null;
  appearance: AvatarCustomization | null;
  trainerLevel: number;
  kithOwned: number;
};

export default function PlayerProfilePage() {
  const { playerId } = useParams();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError("");
    void apiFetch<PlayerProfile>(`/api/profiles/${encodeURIComponent(playerId ?? "")}`)
      .then((result) => { if (!cancelled) setProfile(result); })
      .catch((problem: unknown) => {
        if (!cancelled) setError(problem instanceof Error ? problem.message : "Could not load this profile.");
      });
    return () => { cancelled = true; };
  }, [playerId]);

  return (
    <div className="dp-profile-page">
      <section className="dp-profile-trainer-panel dp-profile-star-panel">
        {error ? <p role="alert">{error}</p> : !profile ? (
          <p role="status">Loading player profile...</p>
        ) : (
          <>
            <div className="dp-profile-viewport" aria-label="Trainer viewport">
              <div className="dp-profile-trainer-avatar">
                <AvatarPreview customization={profile.appearance ?? DEFAULT_AVATAR} />
              </div>
            </div>
            <div className="dp-profile-info">
              <h1>{profile.displayName}</h1>
              <dl className="dp-profile-details">
                <div><dt>Username</dt><dd>{profile.username ?? "--"}</dd></div>
                <div><dt>Title</dt><dd>{profile.title ?? "No Title"}</dd></div>
                <div><dt>Joined</dt><dd>{new Date(profile.joinedAt).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}</dd></div>
                <div><dt>Trainer Level</dt><dd>{profile.trainerLevel}</dd></div>
                <div><dt>Kith Owned</dt><dd>{profile.kithOwned.toLocaleString()}</dd></div>
              </dl>
            </div>
          </>
        )}
        <Link to="/profile">Back to my profile</Link>
      </section>
    </div>
  );
}
