// NOTE: Path casing matters on Linux/CI. Folder is `components/brand`, not `Brand`.
import { SpinningDelta } from "@/components/brand/SpinningDelta";

export function DonateButton() {
  return (
    <div className="dp-donateWrap">
      <a
        href="https://ko-fi.com/jaydendevfolio"
        target="_blank"
        rel="noopener noreferrer"
        className="dp-donateBtn"
      >
        <span className="dp-donateIcon">☕</span>
        <span>
          <span className="dp-donateClick">Click here</span> to Support
          DeltaPets! All proceeds go to deployment, Thank you!
        </span>
      </a>

      {/* Bigger triangle */}
      <SpinningDelta size={150} />
    </div>
  );
}
