import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../app/providers/AuthProvider";

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

//These are for other files.

//so anchors dont get lost:
//state={{ from: location.pathname + location.search + location.hash }}

//After Successful login:
// const from = (location.state as any)?.from ?? "/";
//navigate(from, { replace: true });
