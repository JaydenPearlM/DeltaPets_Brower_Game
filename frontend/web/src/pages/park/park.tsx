import "./park.css";

export default function ParkPage() {
  return (
    <div className="dp-park-page">
      <h1>Park</h1>
      <p className="dp-park-subtitle">
        Placeholder page, multiplayer trade and friendly battle not built yet
      </p>

      <div className="dp-park-panel">
        <h2>Friends Online</h2>
        <div className="dp-park-slot">No friends online yet</div>
      </div>

      <div className="dp-park-panel">
        <h2>Trade</h2>
        <p>
          Placeholder for offering and requesting Kith or items with a friend.
        </p>
      </div>

      <div className="dp-park-panel">
        <h2>Friendly Battle</h2>
        <p>Placeholder for challenging a friend to a non-ranked PVP battle.</p>
      </div>

      <button className="dp-park-invite-btn" type="button">
        Invite a Friend
      </button>
    </div>
  );
}
