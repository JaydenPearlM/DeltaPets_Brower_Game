import "./BattleArenaPage.css";

export default function BattleArenaPage() {
  return (
    <div className="dp-arena-page">
      <h1>Battle Arena</h1>
      <p className="dp-arena-subtitle">
        Placeholder page, PVE battle flow not connected yet
      </p>

      <div className="dp-arena-panel">
        <h2>Opponent</h2>
        <p>Placeholder enemy line, level, and preview.</p>
      </div>

      <div className="dp-arena-panel">
        <h2>Your Party</h2>
        <div className="dp-arena-slot">Pet 1: empty</div>
        <div className="dp-arena-slot">Pet 2: empty</div>
        <div className="dp-arena-slot">Pet 3: empty</div>
      </div>

      <button className="dp-arena-start-btn" type="button">
        Start Battle
      </button>
    </div>
  );
}
