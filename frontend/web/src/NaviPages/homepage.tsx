import { useAuth } from "../app/providers/AuthProvider";
import { LoginForm } from "../components/Authentication/LoginForm";
import { SignupForm } from "../components/Authentication/SignupForm";
import { LogoutButton } from "../components/Authentication/LogoutButton";

export default function Homepage() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <main>
      <h1>DeltaPets</h1>

      {!user ? (
        <>
          <LoginForm />
          <SignupForm />
        </>
      ) : (
        <>
          <p>Logged in as {user.email}</p>
          <LogoutButton />
        </>
      )}
    </main>
  );
}
