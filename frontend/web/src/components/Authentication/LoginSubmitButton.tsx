import { DeltaLogs } from "../Devlog/logs";

type LoginSubmitButtonProps = {
  loading?: boolean;
};

export function LoginSubmitButton({ loading = false }: LoginSubmitButtonProps) {
  return (
    <button type="submit" disabled={loading} className="dp-btn dp-btn--yellow">
      {loading ? "Creating..." : "Sign in"}
    </button>
  );
}
const handleSignup = async () => {
  try {
    const response = await signupUser(email, password);
    DeltaLogs.auth.signupSuccess(response.user.id, response.user.username);
  } catch (error) {
    DeltaLogs.auth.signupFailed(error.message);
  }
};
