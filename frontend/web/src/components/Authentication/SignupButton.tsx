type SignupButtonProps = {
  onClick: () => void;
};

export function SignupButton({ onClick }: SignupButtonProps) {
  return (
    <button type="button" onClick={onClick}>
      Create Account
    </button>
  );
}
