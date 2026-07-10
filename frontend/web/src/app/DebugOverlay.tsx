import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api/baseClient";
import "./DevLogsPage.css";

type ServerLog = {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  tag: string;
  message: string;
  color?: string;
  data?: unknown;
};

type ServerLogDisplayType = "log" | "warn" | "error";

export default function DevLogsPage() {
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [error, setError] = useState("");

  async function fetchServerLogs() {
    try {
      const data = await apiFetch<{ logs: ServerLog[] }>("/api/debug/logs");

      setServerLogs(data.logs ?? []);
      setError("");
    } catch (err) {
      console.error("[dev-logs] failed to fetch server logs", err);
      setError("Unable to load development logs.");
    }
  }

  useEffect(() => {
    void fetchServerLogs();

    const intervalId = window.setInterval(() => {
      void fetchServerLogs();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const getServerLogType = (
    level: ServerLog["level"],
  ): ServerLogDisplayType => {
    if (level === "error") return "error";
    if (level === "warn") return "warn";
    return "log";
  };

  const getServerLogColor = (log: ServerLog): string => {
    return log.color ?? getServerLogType(log.level);
  };

  return (
    <main className="devLogsPage">
      <section className="devLogsPanel">
        <header className="devLogsHeader">
          <div>
            <h1>Developer Logs</h1>
            <p>Server logs refresh automatically every two seconds.</p>
          </div>

          <div className="devLogsActions">
            <button type="button" onClick={fetchServerLogs}>
              Refresh
            </button>

            <button type="button" onClick={() => setServerLogs([])}>
              Clear View
            </button>
          </div>
        </header>

        {error ? <p className="devLogsError">{error}</p> : null}

        <div className="devLogsBody">
          {serverLogs.length === 0 && !error ? (
            <p className="devLogsEmpty">No server logs yet.</p>
          ) : null}

          {serverLogs.map((log, index) => (
            <pre
              key={`${log.timestamp}-${index}`}
              className={`devLogsEntry ${getServerLogType(
                log.level,
              )} ${getServerLogColor(log)}`}
            >
              [{log.timestamp}] [{log.level.toUpperCase()}] [{log.tag}]{" "}
              {log.message}
              {log.data ? ` ${JSON.stringify(log.data, null, 2)}` : ""}
            </pre>
          ))}
        </div>
      </section>
    </main>
  );
}
