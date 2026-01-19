type LoginSubmitButtonProps = {
  loading?: boolean;
};

export function LoginSubmitButton({ loading = false }: LoginSubmitButtonProps) {
  return (
    <button type="submit" disabled={loading}>
      {loading ? "Logging in..." : "Submit"}
    </button>
  );
}
