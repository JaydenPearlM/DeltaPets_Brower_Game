import "./petFarmFood.css";

const placeholderPlots = [
  { id: "plot-1", status: "Empty" },
  { id: "plot-2", status: "Empty" },
  { id: "plot-3", status: "Empty" },
  { id: "plot-4", status: "Empty" },
];
export default function FarmPage() {
  return (
    <div className="dp-farm-page">
      <h1>Farm</h1>
      <p className="dp-farm-subtitle">
        Placeholder page, planting and watering not built yet
      </p>

      <div className="dp-farm-panel">
        <h2>Plots</h2>
        <div className="dp-farm-plots">
          {placeholderPlots.map((plot) => (
            <div className="dp-farm-plot" key={plot.id}>
              {plot.status}
            </div>
          ))}
        </div>
      </div>

      <div className="dp-farm-panel">
        <h2>Seeds</h2>
        <p>Placeholder for seed inventory and planting.</p>
      </div>

      <div className="dp-farm-panel">
        <h2>Fishing</h2>
        <p>Placeholder for a fishing spot, separate from the crop plots.</p>
      </div>
    </div>
  );
}
