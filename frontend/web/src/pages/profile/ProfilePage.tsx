import "./ProfilePage.css";

export default function ProfilePage() {
  return (
    <div className="dp-profile-page">
      <div className="dp-profile-header">
        <h1>Profile</h1>
        <p className="dp-profile-subtitle">
          Placeholder page, not wired up yet
        </p>
      </div>

      <div className="dp-profile-panel">
        <div className="dp-profile-avatar" />
        <div className="dp-profile-info">
          <p>
            <strong>Username:</strong> placeholder_user
          </p>
          <p>
            <strong>Display Name:</strong> Trainer
          </p>
          <p>
            <strong>Trainer Level:</strong> 1
          </p>
          <p>
            <strong>Joined:</strong> --
          </p>
          <p>
            <strong>Role:</strong> player
          </p>
          <p>
            <strong>Starter Element:</strong> --
          </p>
          <p>
            <strong>Title:</strong> Title from quests
          </p>
        </div>
      </div>

      <div className="dp-profile-panel">
        <h2>Stats</h2>
        <p>
          <strong>Kith Owned:</strong> 0
        </p>
        <p>Placeholder for lifetime stats, awards, ribbons and progression.</p>
      </div>

      <div className="dp-profile-panel">
        <h2>Trainer Talent Trees</h2>
        <p>
          <strong>Kith Bonding:</strong> Talent tree for increasing trainer
          bonuses with pets.
        </p>
        <p>
          <strong>Genesis:</strong> Talent tree for trainer breeding bonuses.
        </p>
      </div>

      <div className="dp-profile-panel">
        <h2>Main Team</h2>
        <p>Placeholder for active party preview.</p>
      </div>

      <div className="dp-profile-panel">
        <h2>Ribbons</h2>
        <p>Placeholder for ribbons.</p>
      </div>
      <div className="dp-profile-panel">
        <h2>Achievements</h2>
        <p>Placeholder for Achievments</p>
      </div>
    </div>
  );
}
