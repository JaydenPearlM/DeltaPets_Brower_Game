import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../app/providers/useAuth";
import { useEnterGame } from "../../app/entry/useEnterGame";

type UseLoginSubmitArgs = {
  identifier: string;
  password: string;
  captchaToken: string | null;
  onMessage: (msg: string | null) => void;
  onAfterAttempt?: () => void;
};

function isEmailNotConfirmedMessage(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("email not confirmed") || m.includes("not confirmed");
}

export function useLoginSubmit({
  identifier,
  password,
  captchaToken,
  onMessage,
  onAfterAttempt,
}: UseLoginSubmitArgs) {
  const { signIn } = useAuth();

  // ✅ CALL THE HOOK HERE (top-level, safe)
  const { enterGame } = useEnterGame();

  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      onMessage(null);

      const raw = identifier.trim();

      if (!raw || !password) {
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
          password,
          captchaToken: captchaToken ?? "",
        });

        if (result.error) {
          const msg = String(result.error.message ?? "Login failed.");

          if (isEmailNotConfirmedMessage(msg)) {
            onMessage("Verify your email first. Check your inbox.");
            return;
          }

          onMessage(msg);
          return;
        }

        // ✅ THIS IS THE ONLY ROUTING DECISION
        await enterGame();
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
