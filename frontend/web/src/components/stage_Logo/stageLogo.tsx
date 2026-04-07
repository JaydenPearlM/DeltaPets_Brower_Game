type StageLogoProps = {
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
  className?: string;
};

export function StageLogo({
  size = "md",
  align = "left",
  className = "",
}: StageLogoProps) {
  return (
    <div className={`dp-logoWrapper dp-logoWrapper--${align} ${className}`}>
      <div className={`dp-logo dp-logo--${size}`}>DeltaPets</div>

      <div className="dp-logoTag">
        Raise. Train. Evolve. <span className="dp-logoBond">Bond.</span>
      </div>
    </div>
  );
}
