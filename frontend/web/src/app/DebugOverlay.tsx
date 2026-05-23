import { useEffect, useState } from "react";

type DebugLog = {
  type: "log" | "warn" | "error";
  message: string;
  time: string;
};

const MAX_LOGS = 100;

export function DebugOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: DebugLog["type"], args: unknown[]) => {
      const message = args
        .map((arg) =>
          typeof arg === "string" ? arg : JSON.stringify(arg, null, 2),
        )
        .join(" ");

      setLogs((currentLogs) =>
        [
          {
            type,
            message,
            time: new Date().toLocaleTimeString(),
          },
          ...currentLogs,
        ].slice(0, MAX_LOGS),
      );
    };

    console.log = (...args: unknown[]) => {
      originalLog(...args);
      addLog("log", args);
    };

    console.warn = (...args: unknown[]) => {
      originalWarn(...args);
      addLog("warn", args);
    };

    console.error = (...args: unknown[]) => {
      originalError(...args);
      addLog("error", args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 9999,
        }}
      >
        🐛 Debug
      </button>

      {isOpen ? (
        <section
          style={{
            position: "fixed",
            right: "16px",
            bottom: "56px",
            width: "420px",
            maxHeight: "360px",
            overflow: "auto",
            zIndex: 9999,
            padding: "12px",
            background: "#111",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "12px",
          }}
        >
          <button type="button" onClick={() => setLogs([])}>
            Clear
          </button>

          {logs.length === 0 ? (
            <p>No logs yet.</p>
          ) : (
            logs.map((log, index) => (
              <pre key={`${log.time}-${index}`}>
                [{log.time}] [{log.type.toUpperCase()}] {log.message}
              </pre>
            ))
          )}
        </section>
      ) : null}
    </>
  );
}
