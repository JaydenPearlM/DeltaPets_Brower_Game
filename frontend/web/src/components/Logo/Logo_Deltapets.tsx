import "./Logo_Deltapets.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";

type Props = {
  variant?: "hero" | "header";
  className?: string;
};

export default function LogoDeltapets({ variant = "hero", className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const to = user ? "/pet" : "/";

  const content = (
    <div
      className={`dp-banner dp-banner--${variant} ${className ?? ""}`.trim()}
      aria-label="DeltaPets Alpha"
    >
      <div className="dp-triWrap" aria-hidden="true">
        <div className="dp-tri" />
      </div>

      <div className="dp-banner-inner">
        <span className="logo-deltapets-text">DeltaPets</span>
        <span className="logo-deltapets-alpha">ALPHA</span>
        <span className="logo-deltapets-season">BOND</span>
      </div>
    </div>
  );

  //  Header is clickable, but NOT an <a> (prevents nested anchor errors)
  if (variant === "header") {
    const go = () => navigate(to);

    return (
      <div
        className="dp-logoLink"
        role="link"
        tabIndex={0}
        aria-label="Go to pets page"
        onClick={go}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") go();
        }}
        style={{ cursor: "pointer" }}
      >
        {content}
      </div>
    );
  }

  return content;
}
