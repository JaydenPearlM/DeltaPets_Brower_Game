import "./gym.css";

export default function Gym() {
  return (
    <div className="gym-page">
      <h1>Gym</h1>
      <p className="gym-subtitle">
        Placeholder page, training logic not built yet
      </p>

      <div className="gym-panel">
        <h2>Training Slots</h2>
        <div className="gym-slot">Slot 1: empty</div>
        <div className="gym-slot">Slot 2: empty</div>
        <div className="gym-slot">Slot 3: empty</div>
      </div>

      <div className="gym-panel">
        <h2>Stat Focus</h2>
        <p>Placeholder for choosing which stat to train.</p>
      </div>
    </div>
  );
}
