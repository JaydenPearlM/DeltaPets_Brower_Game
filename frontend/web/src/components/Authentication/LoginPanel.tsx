import { useState } from "react";
import { LoginButton } from "./LoginButton";
import { LoginForm } from "./LoginForm";

export function LoginPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {!open && <LoginButton onClick={() => setOpen(true)} />}

      {open && <LoginForm onMessage={(msg) => msg && console.log(msg)} />}
    </div>
  );
}
