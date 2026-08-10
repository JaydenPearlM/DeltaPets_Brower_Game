import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import "./AuthCallBack.css";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Establishing your Delta Network connection…");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let handled = false;

    async function finishVerification() {
      if (cancelled || handled) return;

      handled = true;

      const { error } = await supabase.auth.signOut();

      if (cancelled) return;

      if (error) {
        console.error(
          "[auth] callback sign-out failed:",
          error.message ?? error,
        );
        setMsg("Account verified. Please sign out and sign in again.");
        return;
      }

      window.history.replaceState({}, document.title, "/authcallback");

      setVerified(true);
      setMsg(
        "Your account has been recognized by the Delta Network. The path into Aliune is now open.",
      );
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          void finishVerification();
        }
      },
    );

    void (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error("[auth] callback failed:", error.message ?? error);
        setMsg("Account verification failed. Please try the link again.");
        return;
      }

      if (data.session) {
        await finishVerification();
      }
    })();

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="authCallbackPage">
      <section className="authCallbackShell">
        <div className="authCallbackPanel dp-blue-grid-panel">
          <div className="authCallbackScan" aria-hidden="true" />

          <div className="authCallbackMark" aria-hidden="true">
            △
          </div>

          <p className="authCallbackSignal">
            {verified
              ? "ALIUNE SIGNAL ESTABLISHED"
              : "ALIUNE SIGNAL CONNECTING"}
          </p>

          <h1 className="authCallbackLogo">DeltaPets</h1>

          <h2 className="authCallbackTitle">
            {verified ? "ACCOUNT ACTIVATED" : "VERIFYING ACCOUNT"}
          </h2>

          {verified ? (
            <div className="authCallbackTerminal">
              <p className="authCallbackTerminalLine authCallbackTerminalLine1">
                &gt; Trainer signature recognized
              </p>
              <p className="authCallbackTerminalLine authCallbackTerminalLine2">
                &gt; Network status: VALID
              </p>
              <p className="authCallbackTerminalLine authCallbackTerminalLine3">
                &gt; Access path: ALIUNE
              </p>
              <p className="authCallbackTerminalLine authCallbackTerminalLine4">
                &gt; Entry authorization: READY
              </p>
            </div>
          ) : null}

          <p className="authCallbackMessage">{msg}</p>

          {verified ? (
            <>
              <div className="authCallbackLore">
                <p>A new trainer signature has appeared within the network.</p>
                <p>
                  Sign in when you are ready. Your first journey into Aliune
                  begins beyond this point.
                </p>
              </div>

              <div className="authCallbackActions">
                <button
                  type="button"
                  className="dp-btn dp-btn-yellow"
                  onClick={() => navigate("/signin", { replace: true })}
                >
                  SIGN IN
                </button>

                <button
                  type="button"
                  className="dp-btn dp-btn-yellow"
                  onClick={() => navigate("/signup", { replace: true })}
                >
                  SIGN UP
                </button>
              </div>
            </>
          ) : (
            <div className="authCallbackPulse" aria-hidden="true" />
          )}
        </div>
      </section>
    </main>
  );
}
