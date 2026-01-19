import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../app/providers/useAuth";
import { supabase } from "../lib/supabase/client";
import { LoginMenus } from "../components/Authentication/LoginMenus";
import { LogoDeltapets } from "../components/Logo/Logo_Deltapets";
import "./homepage.css";
import "../global.css";

export default function Homepage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user) navigate("/pet");
  }, [auth.user, navigate]);

  return (
    <div className="homepage">
      <LogoDeltapets />
      <LoginMenus />
    </div>
  );
}
