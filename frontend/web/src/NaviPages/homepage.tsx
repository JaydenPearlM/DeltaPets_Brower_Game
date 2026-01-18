import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/useAuth";
import { supabase } from "../lib/supabase/client";
import { Authentication } from "../components/Authentication/authentication";
import { LogoDeltapets } from "../components/Logo/Logo_Deltapets";

import "./homepage.css";
import "../global.css";

export default function Homepage() {
  return (
    <div className="homepage">
      <LogoDeltapets />
    </div>
  );
}
