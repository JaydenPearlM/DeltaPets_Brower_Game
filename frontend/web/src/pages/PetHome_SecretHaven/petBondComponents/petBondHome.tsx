import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/useAuth";
import "./petBondHome.css";

export default function PetBondHome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  return (
    <div className="bondPage">
      <div className="bondTop">
        <div>
          <div className="bondTitle">Secret Haven</div>
          <div className="bondSub">
            Bond Room only • furniture/home system later
          </div>
        </div>

        <div className="bondNav">
          <button className="bondBtn" onClick={() => navigate("/pet")}>
            Back to Pet
          </button>
          <button className="bondBtn" onClick={() => navigate("/hatchery")}>
            Hatchery
          </button>
        </div>
      </div>

      <div className="bondCard">
        <div className="bondCardTitle">Bond Room (WIP)</div>
        <div className="bondCardBody">
          This is the future “house” system: furniture, layouts, themes, buffs,
          bonding interactions, etc. We’re keeping this route stable now so we
          can keep stacking features without rewiring navigation.
        </div>

        <div className="bondNote">
          Care Room is NOT here anymore — it lives as a component inside{" "}
          <code>/pet</code>.
        </div>
      </div>
    </div>
  );
}
