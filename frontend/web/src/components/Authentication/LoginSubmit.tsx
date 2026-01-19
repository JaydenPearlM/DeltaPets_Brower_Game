import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";

type UseLoginSubmitArgs = {
  identifier: string;
  password: string;
  captchaToken: string | null;
  onMessage: (msg: string | null) => void;
  onAfterAttempt?: () => void;
};

export function useLoginSubmit({
  identifier,
  password,
  captchaToken,
  onMessage,
  onAfterAttempt,
}: UseLoginSubmitArgs) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const raw = identifier.trim();

      if (!raw || !password) {
        onMessage("Missing email and password.");
        return;
      }

      // ✅ Only require captcha if site key exists
      const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
        | string
        | undefined;

      if (siteKey && !captchaToken) {
        onMessage("Please complete the Turnstile check.");
        return;
      }

      setLoading(true);
      try {
        const result = await signIn({
          identifier: raw,
          password,
          captchaToken: captchaToken ?? "",
        });

        if (result.error) {
          onMessage(result.error.message ?? "Login failed.");
          return;
        }

        navigate("/pets");
      } finally {
        setLoading(false);
        onAfterAttempt?.();
      }
    },
    [
      identifier,
      password,
      captchaToken,
      signIn,
      navigate,
      onMessage,
      onAfterAttempt,
    ],
  );

  return { loading, handleSubmit };
}
