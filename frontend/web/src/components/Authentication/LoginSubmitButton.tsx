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
