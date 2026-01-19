import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
};

export function TurnstileWidget({ siteKey, onToken }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!elRef.current) return;

    function render() {
      if (!window.turnstile || !elRef.current) return;

      // Clear any previous render
      elRef.current.innerHTML = "";

      widgetIdRef.current = window.turnstile.render(elRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
      });
    }

    // If script already loaded
    if (window.turnstile) {
      render();
      return;
    }

    // Inject the Turnstile script once
    const existing = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      // script is loading; try render shortly
      const t = window.setTimeout(render, 300);
      return () => window.clearTimeout(t);
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey, onToken]);

  // optional: expose reset behavior by re-rendering when parent clears token
  return <div ref={elRef} />;
}
