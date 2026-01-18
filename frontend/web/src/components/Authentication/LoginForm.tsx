type LoginFormProps = {
  onMessage?: (msg: string | null) => void;
};

export function LoginForm({ onMessage }: LoginFormProps) {
  async function handleLogin() {
    try {
      // your login logic here

      onMessage?.("Logged in successfully");
    } catch (err: any) {
      onMessage?.(err?.message ?? "Login failed");
    }
  }

  return (
    <form>
      {/* inputs */}

      <button type="button" onClick={handleLogin}>
        Login
      </button>
    </form>
  );
}
