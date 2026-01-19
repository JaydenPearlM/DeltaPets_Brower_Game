import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../../../../components/Authentication/LogoutButton";
import { useAuth } from "../../../../../app/providers/useAuth";

export default function PetPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, user, navigate]);

  if (loading) return null;

  return (
    <div style={{ padding: 16 }}>
      <h1>Pet Page</h1>
      <p>If you can see this, login routing worked ✅</p>

      <div style={{ marginTop: 16 }}>
        <LogoutButton />
      </div>
    </div>
  );
}
