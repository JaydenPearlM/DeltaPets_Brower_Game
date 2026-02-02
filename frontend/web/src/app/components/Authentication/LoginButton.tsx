type LoginButtonProps = {
  onClick: () => void;
};

export function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <button type="button" onClick={onClick}>
      Login
    </button>
  );
}
