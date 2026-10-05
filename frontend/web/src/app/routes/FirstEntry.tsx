import { useNavigate } from "react-router-dom";
import "./AuthCallBack.css";

export default function FirstEntry() {
  const navigate = useNavigate();

  return (
    <main className="authCallbackPage">
      <section className="authCallbackShell">
        <div className="authCallbackPanel dp-blue-grid-panel">
          <div className="authCallbackScan" aria-hidden="true" />

          <div className="authCallbackMark" aria-hidden="true">
            △
          </div>

          <p className="authCallbackSignal">ALIUNE SIGNAL ESTABLISHED</p>

          <h1 className="authCallbackLogo">DeltaPets</h1>

          <h2 className="authCallbackTitle">ENTRY AUTHORIZED</h2>

          <div className="authCallbackTerminal">
            <p className="authCallbackTerminalLine authCallbackTerminalLine1">
              &gt; Trainer signature recognized
            </p>

            <p className="authCallbackTerminalLine authCallbackTerminalLine2">
              &gt; Network status: VALID
            </p>

            <p className="authCallbackTerminalLine authCallbackTerminalLine3">
              &gt; Destination: ALIUNE
            </p>

            <p className="authCallbackTerminalLine authCallbackTerminalLine4">
              &gt; Connection status: READY
            </p>
          </div>

          <p className="authCallbackMessage">
            Your presence has been registered within the Delta Network.
          </p>

          <div className="authCallbackLore">
            <p>What waits beyond this point is not a menu.</p>

            <p>It is a world.</p>

            <p>Your journey into Aliune begins now.</p>
          </div>

          <div className="authCallbackActions">
            <button
              type="button"
              className="dp-btn dp-btn-yellow"
              onClick={() => navigate("/create", { replace: true })}
            >
              ENTER DELTAPETS
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
