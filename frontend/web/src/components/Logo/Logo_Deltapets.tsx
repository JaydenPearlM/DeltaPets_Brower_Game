import "./Logo_Deltapets.css";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";

type Props = {
  variant?: "hero" | "header";
  className?: string;
};

export default function LogoDeltapets({ variant = "hero", className }: Props) {
  const { user } = useAuth();
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

  // ✅ Only the header version is clickable
  if (variant === "header") {
    return (
      <Link to={to} className="dp-logoLink" aria-label="Go to pets page">
        {content}
      </Link>
    );
  }

  return content;
}
