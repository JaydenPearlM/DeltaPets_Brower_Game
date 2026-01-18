type SignupFormProps = {
  onMessage?: (msg: string | null) => void;
};

export function SignupForm({ onMessage }: SignupFormProps) {
  async function handleSignup() {
    try {
      // your signup logic here

      onMessage?.("Account created!");
    } catch (err: any) {
      onMessage?.(err?.message ?? "Signup failed");
    }
  }

  return (
    <form>
      {/* inputs */}

      <button type="button" onClick={handleSignup}>
        Create Account
      </button>
    </form>
  );
}
