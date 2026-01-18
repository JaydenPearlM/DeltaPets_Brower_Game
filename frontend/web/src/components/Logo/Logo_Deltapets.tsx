import "./Logo_Deltapets.css";

export function LogoDeltapets() {
  return (
    <div className="dp-banner" aria-label="DeltaPets Alpha">
      <div className="dp-triWrap" aria-hidden="true">
        <div className="dp-tri" />
      </div>

      <div className="dp-banner-inner">
        <span className="logo-deltapets-text">DeltaPets</span>
        <span className="logo-deltapets-alpha">ALPHA</span>
      </div>
    </div>
  );
}
