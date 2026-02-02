import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../providers/useAuth";
import { useEnterGame } from "../../entry/useEnterGame";

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

  // ✅ routing decision lives in enterGame()
  const { enterGame } = useEnterGame();

  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      onMessage(null);

      const raw = identifier.trim();
      const pass = password;

      if (!raw || !pass) {
        onMessage("Missing email and password.");
        return;
      }

      // Only require Turnstile if site key exists
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
          password: pass,
          captchaToken: captchaToken ?? undefined,
        });

        if (result.error) {
          const msg = String(result.error.message ?? "Login failed.");
          onMessage(msg);
          return;
        }

        // ✅ After successful login:
        // - if user has no pet yet => /create (cutscene)
        // - else => /pet
        await enterGame();
      } catch (err) {
        console.error("Login submit failed:", err);
        onMessage("Login failed. Please try again.");
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
      enterGame,
      onMessage,
      onAfterAttempt,
    ],
  );

  return { loading, handleSubmit };
}
