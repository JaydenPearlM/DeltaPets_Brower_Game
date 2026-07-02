import "./battleDungeons.css";

const placeholderDungeons = [
  { id: "dungeon-1", name: "Placeholder Dungeon 1", difficulty: "Easy" },
  { id: "dungeon-2", name: "Placeholder Dungeon 2", difficulty: "Medium" },
  { id: "dungeon-3", name: "Placeholder Dungeon 3", difficulty: "Hard" },
];

export default function BattleDungeonsPage() {
  return (
    <div className="dp-dungeons-page">
      <h1>Battle Dungeons</h1>
      <p className="dp-dungeons-subtitle">
        Placeholder page, dungeon runs not implemented yet
      </p>

      <div className="dp-dungeons-list">
        {placeholderDungeons.map((d) => (
          <div className="dp-dungeons-card" key={d.id}>
            <h2>{d.name}</h2>
            <p>Difficulty: {d.difficulty}</p>
            <button className="dp-dungeons-enter-btn" type="button">
              Enter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
