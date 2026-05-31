import { useEffect, useRef, useState } from "react";
import "./DebugOverlay.css";

type ServerLog = {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  tag: string;
  message: string;
  data?: unknown;
};

type ServerLogDisplayType = "log" | "warn" | "error";

export function DebugOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [position, setPosition] = useState({ x: 96, y: 96 });
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  async function fetchServerLogs() {
    try {
      const res = await fetch("/api/debug/logs");
      const data = await res.json();

      setServerLogs(data.logs ?? []);
    } catch (err) {
      console.error("[debug-overlay] failed to fetch server logs", err);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    void fetchServerLogs();

    const intervalId = window.setInterval(() => {
      void fetchServerLogs();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragOffsetRef.current) return;

      setPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      dragOffsetRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startDrag = (event: React.MouseEvent<HTMLElement>) => {
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const getServerLogType = (
    level: ServerLog["level"],
  ): ServerLogDisplayType => {
    if (level === "error") return "error";
    if (level === "warn") return "warn";
    return "log";
  };

  return (
    <>
      <button
        type="button"
        className="debugOverlayButton"
        onClick={() => setIsOpen((current) => !current)}
      >
        🐛 Debug
      </button>

      {isOpen ? (
        <section
          className="debugOverlayPanel"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <header className="debugOverlayHeader" onMouseDown={startDrag}>
            <strong>Server Logs</strong>

            <div className="debugOverlayActions">
              <button type="button" onClick={fetchServerLogs}>
                Refresh
              </button>

              <button type="button" onClick={() => setServerLogs([])}>
                Clear
              </button>

              <button type="button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
          </header>

          <div className="debugOverlayBody">
            {serverLogs.length === 0 ? (
              <p className="debugOverlayEmpty">No server logs yet.</p>
            ) : null}

            {serverLogs.map((log, index) => (
              <pre
                key={`${log.timestamp}-${index}`}
                className={`debugOverlayLog ${getServerLogType(log.level)}`}
              >
                [{log.timestamp}] [{log.level.toUpperCase()}] [{log.tag}]{" "}
                {log.message}
                {log.data ? ` ${JSON.stringify(log.data)}` : ""}
              </pre>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
